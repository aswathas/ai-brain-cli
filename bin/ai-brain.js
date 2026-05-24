#!/usr/bin/env node

/**
 * AI Brain CLI Entry Point
 *
 * This script is the executable entry point for the ai-brain CLI.
 * It transpiles TypeScript on the fly and runs the main index.ts.
 */

'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Determine if we need to run via ts-node or compiled JS
const distPath = path.join(__dirname, '..', 'dist', 'index.js');
const srcPath = path.join(__dirname, '..', 'src', 'index.ts');

// Check if we should use ts-node (development) or compiled (production)
const useTsNode = process.env.AI_BRAIN_DEV === '1' ||
  (!fs.existsSync(distPath) && fs.existsSync(srcPath));

function getGitRootDir() {
  // Start from this file's directory and walk up looking for .git
  let dir = __dirname;
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

function nodeCommand() {
  return process.argv[0];
}

function main() {
  const args = process.argv.slice(2);

  if (useTsNode) {
    // Development mode: use ts-node
    const tsNodePath = path.join(__dirname, '..', 'node_modules', 'ts-node', 'dist', 'bin.js');

    if (!fs.existsSync(tsNodePath)) {
      console.error('Error: ts-node not found. Please run: npm install');
      console.error('Or run: npm run build to compile TypeScript');
      process.exit(1);
    }

    const child = spawn(nodeCommand(), [tsNodePath, '--transpile-only', srcPath], {
      stdio: 'inherit',
      env: { ...process.env, AI_BRAIN_DEV: '1' }
    });

    child.on('exit', (code) => {
      process.exit(code);
    });

    child.on('error', (err) => {
      console.error('Failed to start:', err);
      process.exit(1);
    });
  } else {
    // Production mode: use compiled JavaScript
    if (!fs.existsSync(distPath)) {
      console.error('Error: AI Brain not built.');
      console.error('Please run: npm run build');
      process.exit(1);
    }

    const child = spawn(nodeCommand(), [distPath, ...args], {
      stdio: 'inherit'
    });

    child.on('exit', (code) => {
      process.exit(code);
    });

    child.on('error', (err) => {
      console.error('Failed to start:', err);
      process.exit(1);
    });
  }
}

// Handle signals gracefully
process.on('SIGINT', () => {
  console.log('\nInterrupted. Goodbye!');
  process.exit(130);
});

process.on('SIGTERM', () => {
  process.exit(143);
});

// Run main
main();