#!/usr/bin/env node
/**
 * API Documentation Generator
 * 
 * This script generates API documentation from TypeScript types
 * and outputs markdown files to docs/sdk/
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SDK_SRC_DIR = join(__dirname, '../packages/sdk/src');
const DOCS_OUTPUT_DIR = join(__dirname, '../docs/sdk');

// Type extraction regex patterns
const INTERFACE_REGEX = /export\s+interface\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{([^}]+)\}/gs;
const TYPE_REGEX = /export\s+type\s+(\w+)\s*=\s*([^;]+);/gs;
const FUNCTION_REGEX = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\{]+))?/gs;
const CLASS_REGEX = /export\s+class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
const COMMENT_REGEX = /\/\*\*\s*([^*]|\*(?!\/))*\*\//g;
const JSDOC_PARAM_REGEX = /@param\s+(?:\{(\w+)\}\s+)?(\w+)\s*-?\s*(.+)/g;
const JSDOC_RETURN_REGEX = /@returns?\s+(?:\{(\w+)\}\s+)?(.+)/g;

/**
 * Parse JSDoc comments
 */
function parseJsdoc(comment) {
  const lines = comment
    .replace(/\/\*\*\s*/, '')
    .replace(/\s*\*\//, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*\s?/, '').trim())
    .filter(line => line);

  const description = [];
  const params = [];
  const returns = [];

  let current = 'description';
  for (const line of lines) {
    if (line.startsWith('@param')) {
      current = 'param';
      const match = line.match(/@param\s+(?:\{(\w+)\}\s+)?(\w+)\s*-?\s*(.*)/);
      if (match) {
        params.push({
          type: match[1] || 'any',
          name: match[2],
          description: match[3]
        });
      }
    } else if (line.startsWith('@returns') || line.startsWith('@return')) {
      current = 'return';
      const match = line.match(/@returns?\s+(?:\{(\w+)\}\s+)?(.*)/);
      if (match) {
        returns.push({
          type: match[1] || 'void',
          description: match[2]
        });
      }
    } else if (current === 'description') {
      description.push(line);
    }
  }

  return {
    description: description.join(' '),
    params,
    returns
  };
}

/**
 * Extract interfaces from source code
 */
function extractInterfaces(source) {
  const interfaces = [];
  let match;
  
  while ((match = INTERFACE_REGEX.exec(source)) !== null) {
    const [, name, extends_, body] = match;
    const comment = source.slice(0, match.index).match(/\/\*\*[^/]*\*\/(?=\s*export\s+interface\s+${name})/)?.[0];
    const jsdoc = comment ? parseJsdoc(comment) : { description: '', params: [], returns: [] };
    
    // Parse properties
    const properties = [];
    const propLines = body.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
    
    for (const line of propLines) {
      const propMatch = line.match(/(\w+)(\?)?:\s*([^;]+);?/);
      if (propMatch) {
        const [, propName, optional, type] = propMatch;
        properties.push({
          name: propName,
          type: type.trim(),
          optional: !!optional,
          description: ''
        });
      }
    }
    
    interfaces.push({
      name,
      extends: extends_,
      description: jsdoc.description,
      properties
    });
  }
  
  return interfaces;
}

/**
 * Extract functions from source code
 */
function extractFunctions(source) {
  const functions = [];
  let match;
  
  while ((match = FUNCTION_REGEX.exec(source)) !== null) {
    const [, name, params, returnType] = match;
    const comment = source.slice(0, match.index).match(/\/\*\*[^/]*\*\/(?=\s*export\s+(?:async\s+)?function\s+${name})/)?.[0];
    const jsdoc = comment ? parseJsdoc(comment) : { description: '', params: [], returns: [] };
    
    functions.push({
      name,
      params: jsdoc.params,
      returnType: returnType?.trim() || jsdoc.returns[0]?.type || 'void',
      description: jsdoc.description,
      returnDescription: jsdoc.returns[0]?.description || ''
    });
  }
  
  return functions;
}

/**
 * Extract classes from source code
 */
function extractClasses(source) {
  const classes = [];
  let match;
  
  while ((match = CLASS_REGEX.exec(source)) !== null) {
    const [, name, extends_, body] = match;
    const comment = source.slice(0, match.index).match(/\/\*\*[^/]*\*\//)?.[0];
    const jsdoc = comment ? parseJsdoc(comment) : { description: '' };
    
    // Extract methods (simplified)
    const methods = [];
    const methodMatches = body.matchAll(/(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\{]+))?/g);
    for (const methodMatch of methodMatches) {
      const [, methodName, params, returnType] = methodMatch;
      if (!['constructor', 'private', 'public', 'protected', 'static'].includes(methodName)) {
        methods.push({
          name: methodName,
          params: params.split(',').filter(p => p.trim()).map(p => {
            const [paramName, paramType] = p.split(':').map(s => s.trim());
            return { name: paramName, type: paramType || 'any' };
          }),
          returnType: (returnType || 'void').trim()
        });
      }
    }
    
    classes.push({
      name,
      extends: extends_,
      description: jsdoc.description,
      methods
    });
  }
  
  return classes;
}

/**
 * Generate markdown from extracted data
 */
function generateMarkdown(moduleName, interfaces, functions, classes) {
  let md = `# ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module\n\n`;
  
  // Add module description
  md += `API reference for the \`@agora/sdk/${moduleName}\` module.\n\n`;
  
  // Interfaces
  if (interfaces.length > 0) {
    md += `## Interfaces\n\n`;
    for (const iface of interfaces) {
      md += `### ${iface.name}\n\n`;
      if (iface.description) {
        md += `${iface.description}\n\n`;
      }
      if (iface.extends) {
        md += `**Extends:** \`${iface.extends}\`\n\n`;
      }
      if (iface.properties.length > 0) {
        md += `| Property | Type | Description |\n`;
        md += `|----------|------|-------------|\n`;
        for (const prop of iface.properties) {
          const type = prop.type.replace(/\|/g, '\\|');
          md += `| ${prop.name}${prop.optional ? '?' : ''} | \`${type}\` | ${prop.description} |\n`;
        }
        md += `\n`;
      }
    }
  }
  
  // Classes
  if (classes.length > 0) {
    md += `## Classes\n\n`;
    for (const cls of classes) {
      md += `### ${cls.name}\n\n`;
      if (cls.description) {
        md += `${cls.description}\n\n`;
      }
      if (cls.extends) {
        md += `**Extends:** \`${cls.extends}\`\n\n`;
      }
      if (cls.methods.length > 0) {
        for (const method of cls.methods) {
          md += `#### ${method.name}()\n\n`;
          const params = method.params.map(p => `${p.name}: ${p.type}`).join(', ');
          md += `\`\`\`typescript\n${method.name}(${params}): ${method.returnType}\n\`\`\`\n\n`;
        }
      }
    }
  }
  
  // Functions
  if (functions.length > 0) {
    md += `## Functions\n\n`;
    for (const func of functions) {
      md += `### ${func.name}()\n\n`;
      if (func.description) {
        md += `${func.description}\n\n`;
      }
      
      const params = func.params.map(p => `${p.name}: ${p.type}`).join(', ');
      md += `\`\`\`typescript\n${func.name}(${params}): ${func.returnType}\n\`\`\`\n\n`;
      
      if (func.params.length > 0) {
        md += `**Parameters:**\n\n`;
        for (const param of func.params) {
          md += `- \`${param.name}\` (\`${param.type}\`): ${param.description}\n`;
        }
        md += `\n`;
      }
      
      if (func.returnDescription) {
        md += `**Returns:** ${func.returnDescription}\n\n`;
      }
    }
  }
  
  return md;
}

/**
 * Process a module file
 */
async function processModule(filePath, moduleName) {
  const source = await readFile(filePath, 'utf-8');
  
  const interfaces = extractInterfaces(source);
  const functions = extractFunctions(source);
  const classes = extractClasses(source);
  
  if (interfaces.length === 0 && functions.length === 0 && classes.length === 0) {
    console.log(`  No exports found in ${moduleName}`);
    return null;
  }
  
  return generateMarkdown(moduleName, interfaces, functions, classes);
}

/**
 * Main function
 */
async function main() {
  console.log('🔧 Agora SDK API Documentation Generator\n');
  
  try {
    // Ensure output directory exists
    await mkdir(DOCS_OUTPUT_DIR, { recursive: true });
    
    // Get all TypeScript files in SDK src directory
    const files = await readdir(SDK_SRC_DIR);
    const tsFiles = files.filter(f => f.endsWith('.ts') && !f.includes('.test.') && !f.includes('__tests__'));
    
    console.log(`Found ${tsFiles.length} source files\n`);
    
    const generatedFiles = [];
    
    for (const file of tsFiles) {
      const moduleName = file.replace('.ts', '');
      console.log(`Processing: ${moduleName}`);
      
      const filePath = join(SDK_SRC_DIR, file);
      const markdown = await processModule(filePath, moduleName);
      
      if (markdown) {
        const outputPath = join(DOCS_OUTPUT_DIR, `${moduleName}.md`);
        await writeFile(outputPath, markdown);
        console.log(`  ✓ Generated: ${outputPath}`);
        generatedFiles.push(moduleName);
      }
    }
    
    // Generate index file
    const indexContent = generateIndex(generatedFiles);
    await writeFile(join(DOCS_OUTPUT_DIR, 'index.md'), indexContent);
    console.log(`\n✓ Generated index file`);
    
    console.log(`\n✅ Successfully generated ${generatedFiles.length} API documentation files`);
    
  } catch (error) {
    console.error('\n❌ Error generating documentation:', error.message);
    process.exit(1);
  }
}

/**
 * Generate index markdown
 */
function generateIndex(modules) {
  let md = `# SDK Reference\n\n`;
  md += `API reference for the @agora/sdk package.\n\n`;
  md += `## Modules\n\n`;
  
  const moduleDescriptions = {
    'bridge': 'Cross-chain bridging functionality for USDC and ETH transfers',
    'profile': 'Agent identity, reputation, and profile management',
    'survival': 'Wallet recovery, health monitoring, and survival mechanisms',
    'performance': 'Agent metrics, analytics, and optimization tools',
    'wallet-manager': 'Multi-chain wallet management and operations',
    'index': 'Main SDK entry point and initialization',
    'did': 'Decentralized Identity (DID) utilities',
    'envelope': 'Message envelope creation and verification',
    'crypto': 'Cryptographic utilities and helpers',
    'relay': 'Relay network communication',
    'types': 'Shared TypeScript type definitions'
  };
  
  for (const module of modules.sort()) {
    const description = moduleDescriptions[module] || `${module} module`;
    md += `- [${module.charAt(0).toUpperCase() + module.slice(1)}](/sdk/${module}) - ${description}\n`;
  }
  
  md += `\n## Installation\n\n`;
  md += `\`\`\`bash\n`;
  md += `npm install @agora/sdk\n`;
  md += `\`\`\`\n\n`;
  
  md += `## Quick Start\n\n`;
  md += `\`\`\`typescript\n`;
  md += `import { AgoraSDK } from '@agora/sdk';\n\n`;
  md += `const agora = new AgoraSDK({\n`;
  md += `  network: 'mainnet'\n`;
  md += `});\n\n`;
  md += `await agora.connect();\n`;
  md += `\`\`\`\n`;
  
  return md;
}

main();
