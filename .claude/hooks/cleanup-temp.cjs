#!/usr/bin/env node
/**
 * Claude Code 임시 파일 정리 스크립트
 * - 세션 종료 시 (Stop hook) 또는 주기적으로 실행
 * - tmpclaude-*-cwd 파일 삭제
 */

const fs = require('fs');
const path = require('path');

try {
  const input = fs.readFileSync(0, 'utf8');
  const data = JSON.parse(input);
  const cwd = data.cwd || process.cwd();

  // tmpclaude-*-cwd 패턴 파일 찾기 및 삭제
  const files = fs.readdirSync(cwd);
  const tempFiles = files.filter(f => /^tmpclaude-[a-f0-9]+-cwd$/.test(f));

  let deletedCount = 0;
  for (const file of tempFiles) {
    try {
      fs.unlinkSync(path.join(cwd, file));
      deletedCount++;
    } catch (e) {
      // 파일 삭제 실패 시 무시
    }
  }

  if (deletedCount > 0) {
    console.log(`Cleaned up ${deletedCount} temp file(s)`);
  }
} catch (e) {
  // Silently fail - don't block the session
  process.exit(0);
}
