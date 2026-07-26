const path = require('path');
const fs = require('fs');
const express = require('express');

const routeFiles = [
  './backend/routes/authRoutes',
  './backend/routes/businessRoutes',
  './backend/routes/studentRoutes',
  './backend/routes/aiRoutes',
];

const problems = [];

for (const file of routeFiles) {
  try {
    const route = require(path.resolve(file));
    if (!route || typeof route !== 'function') {
      problems.push({ file, error: 'Not an express Router function export' });
      continue;
    }

    // inspect stack
    const stack = route.stack || [];
    for (const layer of stack) {
      const handle = layer.handle;
      if (!handle) continue;
      // For middleware chains, handle can be a function, but we also want to catch if handle is an object with methods
      if (typeof handle !== 'function') {
        problems.push({ file, route: layer.route ? layer.route.path : layer.name, issue: 'handler not function', detail: typeof handle });
      }
    }
  } catch (err) {
    problems.push({ file, error: err.message });
  }
}

if (problems.length === 0) {
  console.log('No route handler problems detected');
  process.exit(0);
}

console.log('Detected problems:');
console.dir(problems, { depth: null });
process.exit(1);
