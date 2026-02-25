import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

const PORT = Number(process.env.PORT || 8790);
const DEFAULT_SANDBOX_ROOT = process.platform === 'darwin'
  ? '/private/tmp/agora-sandbox'
  : '/tmp/agora-sandbox';
const SANDBOX_ROOT = process.env.AGORA_SANDBOX_ROOT || DEFAULT_SANDBOX_ROOT;
const MAX_TIMEOUT_MS = Number(process.env.AGORA_SANDBOX_MAX_TIMEOUT_MS || 30_000);
const MAX_MEMORY_MB = Number(process.env.AGORA_SANDBOX_MAX_MEMORY_MB || 256);
const MAX_CODE_BYTES = Number(process.env.AGORA_SANDBOX_MAX_CODE_BYTES || 200_000);
const MAX_STDIO_BYTES = Number(process.env.AGORA_SANDBOX_MAX_STDIO_BYTES || 200_000);
const MAX_ARTIFACT_BYTES = Number(process.env.AGORA_SANDBOX_MAX_ARTIFACT_BYTES || 300_000);
const KEEP_JOBS = ['1', 'true', 'yes'].includes(String(process.env.AGORA_SANDBOX_KEEP_JOBS || '').toLowerCase());

await fs.mkdir(SANDBOX_ROOT, { recursive: true });

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf-8');
  if (!text.trim()) return {};
  return JSON.parse(text);
}

function normalizeRelativeFilePath(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = path.posix.normalize(value.trim().replace(/\\/g, '/'));
  if (normalized.startsWith('/') || normalized.startsWith('..') || normalized.includes('/../')) return null;
  return normalized;
}

async function setReadonlyRecursive(targetPath) {
  const stat = await fs.stat(targetPath);
  if (stat.isDirectory()) {
    await fs.chmod(targetPath, 0o555);
    const entries = await fs.readdir(targetPath);
    for (const entry of entries) {
      await setReadonlyRecursive(path.join(targetPath, entry));
    }
    return;
  }
  await fs.chmod(targetPath, 0o444);
}

function trimOutput(text) {
  if (text.length <= MAX_STDIO_BYTES) return text;
  return `${text.slice(0, MAX_STDIO_BYTES)}\n...[truncated]`;
}

async function collectArtifacts(writableRoot, artifactPaths) {
  const artifacts = [];
  if (!Array.isArray(artifactPaths)) return artifacts;

  for (const artifactPath of artifactPaths) {
    const relativePath = normalizeRelativeFilePath(artifactPath);
    if (!relativePath) continue;
    const absolutePath = path.join(writableRoot, relativePath);

    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) continue;
      if (stat.size > MAX_ARTIFACT_BYTES) {
        artifacts.push({
          path: relativePath,
          size_bytes: stat.size,
          skipped: true,
          reason: `artifact exceeds MAX_ARTIFACT_BYTES(${MAX_ARTIFACT_BYTES})`,
        });
        continue;
      }
      const data = await fs.readFile(absolutePath);
      artifacts.push({
        path: relativePath,
        size_bytes: stat.size,
        sha256: createHash('sha256').update(data).digest('hex'),
      });
    } catch {
      // ignore missing artifacts
    }
  }

  return artifacts;
}

async function runNodeSandboxJob(job) {
  const code = typeof job.code === 'string' ? job.code : '';
  if (!code.trim()) {
    return {
      ok: false,
      error: 'INVALID_CODE',
      message: 'job.code is required for nodejs execution',
    };
  }
  if (Buffer.byteLength(code, 'utf-8') > MAX_CODE_BYTES) {
    return {
      ok: false,
      error: 'CODE_TOO_LARGE',
      message: `job.code exceeds MAX_CODE_BYTES(${MAX_CODE_BYTES})`,
    };
  }

  const timeoutMs = Math.min(Math.max(Number(job.timeout_ms) || 5_000, 100), MAX_TIMEOUT_MS);
  const memoryMb = Math.min(Math.max(Number(job.max_memory_mb) || 128, 32), MAX_MEMORY_MB);
  const allowNetwork = job.network?.enabled === true;
  const startedAt = new Date();

  const jobId = `${Date.now()}_${randomBytes(4).toString('hex')}`;
  const jobRoot = path.join(SANDBOX_ROOT, jobId);
  const readonlyRoot = path.join(jobRoot, 'readonly');
  const writableRoot = path.join(jobRoot, 'writable');
  const entryFile = path.join(jobRoot, 'entry.mjs');

  await fs.mkdir(readonlyRoot, { recursive: true });
  await fs.mkdir(writableRoot, { recursive: true });

  const inputFiles = Array.isArray(job.readonly_files) ? job.readonly_files : [];
  for (const file of inputFiles) {
    const relativePath = normalizeRelativeFilePath(file?.path);
    if (!relativePath) {
      return {
        ok: false,
        error: 'INVALID_READONLY_FILE_PATH',
        message: `readonly_files has invalid path: ${String(file?.path || '')}`,
      };
    }
    const fileContent = typeof file.content === 'string' ? file.content : '';
    const absolutePath = path.join(readonlyRoot, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, fileContent, 'utf-8');
  }

  if (inputFiles.length > 0) {
    await setReadonlyRecursive(readonlyRoot);
  }

  await fs.writeFile(entryFile, `'use strict';\n${code}`, 'utf-8');
  await fs.chmod(entryFile, 0o444);

  const fsReadTargets = new Set([entryFile, readonlyRoot, writableRoot, jobRoot, SANDBOX_ROOT]);
  for (const candidate of Array.from(fsReadTargets)) {
    try {
      fsReadTargets.add(await fs.realpath(candidate));
    } catch {
      // Ignore paths that cannot be resolved on the current platform.
    }
  }
  const entryRealPath = (await fs.realpath(entryFile).catch(() => entryFile));
  const nodeArgs = [
    '--permission',
    '--disable-proto=throw',
    '--frozen-intrinsics',
    `--allow-fs-write=${writableRoot}`,
    `--max-old-space-size=${memoryMb}`,
  ];
  for (const target of fsReadTargets) {
    nodeArgs.push(`--allow-fs-read=${target}`);
  }
  if (allowNetwork) nodeArgs.push('--allow-net');
  nodeArgs.push(entryRealPath);
  if (['1', 'true', 'yes'].includes(String(process.env.AGORA_SANDBOX_DEBUG || '').toLowerCase())) {
    console.log('[sandbox-runner] node args:', JSON.stringify(nodeArgs));
  }

  const child = spawn(process.execPath, nodeArgs, {
    cwd: writableRoot,
    env: {
      LANG: 'C.UTF-8',
      HOME: writableRoot,
      TMPDIR: writableRoot,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  let timedOut = false;

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString('utf-8');
    if (stdout.length > MAX_STDIO_BYTES * 2) stdout = stdout.slice(-MAX_STDIO_BYTES * 2);
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString('utf-8');
    if (stderr.length > MAX_STDIO_BYTES * 2) stderr = stderr.slice(-MAX_STDIO_BYTES * 2);
  });

  if (typeof job.stdin === 'string' && job.stdin.length > 0) {
    child.stdin.write(job.stdin);
  }
  child.stdin.end();

  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, timeoutMs);

  const exitInfo = await new Promise((resolve) => {
    child.on('error', (error) => resolve({ code: null, signal: null, error: String(error) }));
    child.on('exit', (code, signal) => resolve({ code, signal, error: null }));
  });

  clearTimeout(timer);

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();
  const artifacts = await collectArtifacts(writableRoot, job.artifacts);

  const result = {
    ok: true,
    run_id: jobId,
    language: 'nodejs',
    status: timedOut
      ? 'TIMEOUT'
      : exitInfo.error
        ? 'ERROR'
        : exitInfo.code === 0
          ? 'SUCCESS'
          : 'FAILED',
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: durationMs,
    exit_code: exitInfo.code,
    signal: exitInfo.signal,
    timeout_ms: timeoutMs,
    max_memory_mb: memoryMb,
    network_enabled: allowNetwork,
    stdout: trimOutput(stdout),
    stderr: trimOutput(stderr + (exitInfo.error ? `\n${exitInfo.error}` : '')),
    artifacts,
    writable_root: KEEP_JOBS ? writableRoot : undefined,
  };

  if (!KEEP_JOBS) {
    await fs.rm(jobRoot, { recursive: true, force: true });
  }

  return result;
}

async function handleExecute(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: 'INVALID_JSON',
      message: String(error),
    });
  }

  const job = body?.job && typeof body.job === 'object' ? body.job : body;
  const language = String(job.language || 'nodejs').toLowerCase();
  if (language !== 'nodejs' && language !== 'javascript' && language !== 'js') {
    return sendJson(res, 400, {
      ok: false,
      error: 'UNSUPPORTED_LANGUAGE',
      message: 'Only nodejs/javascript execution is supported in this iteration',
    });
  }

  const result = await runNodeSandboxJob(job);
  if (!result.ok) {
    return sendJson(res, 400, result);
  }

  return sendJson(res, 200, result);
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'agora-sandbox-runner',
      version: '0.1.0',
      sandbox_root: SANDBOX_ROOT,
    });
  }

  if (req.method === 'POST' && req.url === '/execute') {
    return handleExecute(req, res);
  }

  return sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Agora sandbox runner listening on http://127.0.0.1:${PORT}`);
  console.log(`  - GET  /health`);
  console.log(`  - POST /execute`);
  console.log(`  - sandbox root: ${SANDBOX_ROOT}`);
});
