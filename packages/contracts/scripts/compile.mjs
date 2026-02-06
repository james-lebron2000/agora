#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILE = path.join(ROOT, 'src', 'AgoraEscrow.sol');
const OUTPUT_DIR = path.join(ROOT, 'artifacts');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'AgoraEscrow.json');

export function compileEscrow() {
  const source = fs.readFileSync(SOURCE_FILE, 'utf8');
  const input = {
    language: 'Solidity',
    sources: {
      'AgoraEscrow.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors?.length) {
    const errors = output.errors.filter((e) => e.severity === 'error');
    if (errors.length) {
      const text = errors.map((e) => `${e.formattedMessage || e.message}`).join('\n');
      throw new Error(text);
    }
  }

  const contract = output.contracts?.['AgoraEscrow.sol']?.AgoraEscrow;
  if (!contract?.abi || !contract?.evm?.bytecode?.object) {
    throw new Error('Failed to compile AgoraEscrow');
  }

  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const artifact = compileEscrow();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(artifact, null, 2));
  console.log(`[contracts] compiled -> ${OUTPUT_FILE}`);
}
