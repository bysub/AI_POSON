#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

try {
  const input = fs.readFileSync(0, 'utf8');
  const data = JSON.parse(input);
  const toolName = data.tool_name || '';
  const toolInput = data.tool_input || {};

  // 도구별 타겟 추출
  let target = '';
  if (toolInput.file_path) {
    target = toolInput.file_path;
  } else if (toolInput.pattern) {
    target = toolInput.pattern;
  } else if (toolInput.command) {
    target = toolInput.command.substring(0, 50) + (toolInput.command.length > 50 ? '...' : '');
  } else if (toolInput.query) {
    target = toolInput.query;
  }

  const logFile = path.join(os.homedir(), '.claude', 'command-log.txt');
  const logEntry = `[${new Date().toLocaleString()}] Tool: ${toolName} | Target: ${target}\n`;

  fs.appendFileSync(logFile, logEntry);
} catch (e) {
  // Silently fail - don't block the tool
  process.exit(0);
}
