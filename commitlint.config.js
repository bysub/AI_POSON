export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // 새로운 기능
        "fix", // 버그 수정
        "docs", // 문서 변경
        "style", // 코드 포맷팅 (기능 변경 없음)
        "refactor", // 리팩토링
        "perf", // 성능 개선
        "test", // 테스트 추가/수정
        "build", // 빌드 시스템 변경
        "ci", // CI 설정 변경
        "chore", // 기타 변경
        "revert", // 커밋 되돌리기
      ],
    ],
    "scope-enum": [
      1, // warning only
      "always",
      [
        "frontend",
        "backend",
        "electron",
        "payment",
        "auth",
        "api",
        "db",
        "ui",
        "i18n",
        "test",
        "ci",
        "deps",
        "config",
      ],
    ],
    "subject-case": [2, "never", ["upper-case", "pascal-case", "start-case"]],
    "subject-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 200],
  },
};
