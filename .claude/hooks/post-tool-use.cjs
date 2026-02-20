#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

try {
  const input = fs.readFileSync(0, 'utf8');
  const data = JSON.parse(input);
  const filePath = data.tool_input?.file_path || '';
  const action = process.argv[2] || '';

  // file_path가 없으면 (Bash 등) 스킵
  if (!filePath) process.exit(0);

  switch (action) {
    case 'dependency':
      if (filePath.includes('package.json') || filePath.includes('requirements.txt') || filePath.includes('Cargo.toml')) {
        console.log(`Dependency file modified: ${filePath}`);
        if (filePath.includes('package.json')) {
          try { execSync('npm audit', { stdio: 'inherit' }); } catch (e) {}
        }
      }
      break;

    case 'eslint':
      if (/\.(js|ts|jsx|tsx|vue)$/.test(filePath)) {
        try { execSync(`npx eslint "${filePath}" --fix`, { stdio: 'inherit' }); } catch (e) {}
      }
      break;

    case 'prettier':
      if (/\.(js|ts|jsx|tsx|vue|json|css|scss|html)$/.test(filePath)) {
        try { execSync(`npx prettier --write "${filePath}"`, { stdio: 'inherit' }); } catch (e) {}
      }
      break;

    case 'git-add':
      try {
        execSync('git rev-parse --git-dir', { stdio: 'ignore' });
        execSync(`git add "${filePath}"`, { stdio: 'ignore' });
      } catch (e) {}
      break;
  }
} catch (e) {
  // Silently fail - don't block the tool
  process.exit(0);
}
