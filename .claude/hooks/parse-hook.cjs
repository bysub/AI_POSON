#!/usr/bin/env node
const fs = require('fs');

try {
  const input = fs.readFileSync(0, 'utf8');
  const data = JSON.parse(input);
  const toolName = data.tool_name || '';
  const filePath = data.tool_input?.file_path || data.tool_input?.pattern || '';
  console.log(JSON.stringify({ toolName, filePath }));
} catch (e) {
  console.log(JSON.stringify({ toolName: '', filePath: '' }));
}
