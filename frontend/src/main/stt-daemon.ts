import { app, ipcMain } from "electron";
import { spawn, execFileSync, ChildProcess } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { is } from "@electron-toolkit/utils";

// ─── State ───
let sttDaemon: ChildProcess | null = null;
let sttReady = false;
let sttAvailable = false;
let sttBuffer = "";
let sttModelSize = process.env.STT_MODEL ?? "small";
let sttPythonPath: string | null = null;
let sttError: string | null = null;
let sttRetryCount = 0;
const STT_MAX_RETRIES = 3;

// ─── Queue ───
interface SttQueueItem {
  resolve: (value: unknown) => void;
  lang: string;
  timeout: number;
  vocabulary: string[];
  killTimer: ReturnType<typeof setTimeout>;
}
const sttQueue: SttQueueItem[] = [];
let sttProcessing = false;

/** Python 실행 경로를 자동 탐색 */
function findPythonPath(): string | null {
  const candidates = process.platform === "win32"
    ? ["python", "python3", "py"]
    : ["python3", "python"];

  for (const cmd of candidates) {
    try {
      const version = execFileSync(cmd, ["--version"], {
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      console.log(`[STT] Found Python: ${cmd} → ${version}`);
      return cmd;
    } catch {
      // 이 경로에 Python이 없음
    }
  }
  return null;
}

/** STT 스크립트 경로 결정 */
function getSttScriptPath(): string {
  return is.dev
    ? join(__dirname, "../../src/main/stt-whisper.py")
    : join(process.resourcesPath, "stt-whisper.py");
}

function sendSttCommand(cmd: Record<string, unknown>): void {
  if (sttDaemon?.stdin?.writable) {
    sttDaemon.stdin.write(JSON.stringify(cmd) + "\n", "utf8");
  }
}

function drainSttQueue(error: string): void {
  while (sttQueue.length > 0) {
    const item = sttQueue.shift()!;
    clearTimeout(item.killTimer);
    item.resolve({ success: false, error });
  }
  sttProcessing = false;
}

function processNextSttRequest(): void {
  if (sttProcessing || sttQueue.length === 0) return;
  sttProcessing = true;

  const req = sttQueue[0];
  const sttLang = req.lang || "ko-KR";
  console.log(`[STT] Processing queued request: lang=${sttLang}, timeout=${req.timeout}s`);

  sendSttCommand({
    cmd: "recognize",
    lang: sttLang,
    timeout: req.timeout,
    vocab: req.vocabulary,
  });
}

function startSttDaemon(): void {
  if (sttDaemon) return;

  // Python 경로 캐싱
  if (!sttPythonPath) {
    sttPythonPath = findPythonPath();
    if (!sttPythonPath) {
      sttError = "python_not_found";
      sttAvailable = false;
      console.warn("[STT] Python을 찾을 수 없습니다. 음성 인식이 비활성화됩니다.");
      return;
    }
  }

  const scriptPath = getSttScriptPath();
  if (!existsSync(scriptPath)) {
    sttError = "script_not_found";
    sttAvailable = false;
    console.warn(`[STT] 스크립트를 찾을 수 없습니다: ${scriptPath}`);
    return;
  }

  sttAvailable = true;
  sttError = null;

  console.log(`[STT] Starting Whisper daemon (python=${sttPythonPath}, model=${sttModelSize}, script=${scriptPath})...`);
  sttDaemon = spawn(sttPythonPath, [scriptPath, "-model", sttModelSize], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });

  sttReady = false;
  sttBuffer = "";

  sttDaemon.stdout?.on("data", (data: Buffer) => {
    sttBuffer += data.toString("utf8");

    let newlineIdx: number;
    while ((newlineIdx = sttBuffer.indexOf("\n")) !== -1) {
      const line = sttBuffer.slice(0, newlineIdx).trim();
      sttBuffer = sttBuffer.slice(newlineIdx + 1);

      if (!line) continue;
      try {
        const msg = JSON.parse(line);

        if (msg.ready !== undefined) {
          sttReady = msg.ready;
          sttRetryCount = 0;
          if (msg.ready) {
            console.log(`[STT] Daemon ready: model=${msg.model}, device=${msg.device}`);
          } else {
            console.warn(`[STT] Daemon failed to initialize: ${msg.error ?? "unknown"}`);
            sttError = msg.error ?? "init_failed";
          }
          continue;
        }

        if (sttQueue.length > 0) {
          const current = sttQueue.shift()!;
          clearTimeout(current.killTimer);
          console.log("[STT] Result:", msg);
          current.resolve(msg);
          sttProcessing = false;
          processNextSttRequest();
        }
      } catch {
        console.error("[STT] Parse error:", line);
      }
    }
  });

  sttDaemon.stderr?.on("data", (data: Buffer) => {
    const line = data.toString("utf8").trim();
    if (line) console.log("[STT]", line);
  });

  sttDaemon.on("close", (code) => {
    console.log(`[STT] Daemon exited (code=${code})`);
    sttDaemon = null;
    sttReady = false;
    drainSttQueue("daemon_exited");

    if (code !== 0 && code !== null && sttRetryCount < STT_MAX_RETRIES) {
      sttRetryCount++;
      const delay = sttRetryCount * 5000;
      console.log(`[STT] 자동 재시작 예약 (${sttRetryCount}/${STT_MAX_RETRIES}, ${delay / 1000}s 후)`);
      setTimeout(() => startSttDaemon(), delay);
    }
  });

  sttDaemon.on("error", (err) => {
    console.error("[STT] Daemon spawn error:", err.message);
    sttDaemon = null;
    sttReady = false;

    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      sttPythonPath = null;
      sttAvailable = false;
      sttError = "python_not_found";
    } else {
      sttError = err.message;
    }

    drainSttQueue(err.message);
  });
}

/**
 * STT IPC 핸들러 등록 + 데몬 시작
 */
export function registerSttHandlers(): void {
  startSttDaemon();

  ipcMain.handle("stt:isAvailable", async () => {
    if (!sttDaemon && sttAvailable) startSttDaemon();
    return {
      available: sttAvailable,
      ready: sttReady,
      error: sttError,
      python: sttPythonPath,
    };
  });

  ipcMain.handle(
    "stt:recognize",
    async (_event, lang: string, timeoutSec: number, vocabulary?: string[]) => {
      if (!sttAvailable) {
        return { success: false, error: sttError ?? "stt_not_available" };
      }

      if (!sttDaemon) startSttDaemon();

      if (!sttReady) {
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (sttReady || !sttDaemon) { clearInterval(check); resolve(); }
          }, 300);
          setTimeout(() => { clearInterval(check); resolve(); }, 60000);
        });
      }

      if (!sttReady) {
        return { success: false, error: sttError ?? "daemon_not_ready" };
      }

      const timeout = Math.min(Math.max(timeoutSec || 10, 3), 30);
      console.log(`[STT] Recognize: lang=${lang || "ko-KR"}, timeout=${timeout}s, vocab=${vocabulary?.length ?? 0}, queue=${sttQueue.length}`);

      return new Promise((resolve) => {
        const killTimer = setTimeout(() => {
          const idx = sttQueue.findIndex((item) => item.resolve === resolve);
          if (idx !== -1) {
            sttQueue.splice(idx, 1);
            if (idx === 0) sttProcessing = false;
            resolve({ success: false, error: "timeout" });
            processNextSttRequest();
          }
        }, (timeout + 30) * 1000);

        sttQueue.push({
          resolve,
          lang: lang || "ko-KR",
          timeout,
          vocabulary: vocabulary ?? [],
          killTimer,
        });

        processNextSttRequest();
      });
    },
  );

  ipcMain.handle("stt:setModel", async (_event, model: string) => {
    const validModels = ["tiny", "base", "small", "medium", "large-v3"];
    if (!validModels.includes(model)) return { success: false, error: "invalid_model" };
    if (model === sttModelSize && (sttReady || sttDaemon)) return { success: true, model: sttModelSize };

    console.log(`[STT] Switching model: ${sttModelSize} → ${model}`);
    sttModelSize = model;

    if (sttDaemon) {
      const oldDaemon = sttDaemon;
      sttDaemon = null;
      sttReady = false;
      try {
        if (oldDaemon.stdin?.writable) {
          oldDaemon.stdin.write(JSON.stringify({ cmd: "quit" }) + "\n", "utf8");
        }
      } catch { /* ignore */ }
      oldDaemon.removeAllListeners("close");
      oldDaemon.kill();
      drainSttQueue("model_switch");
    }
    startSttDaemon();
    return { success: true, model: sttModelSize };
  });

  ipcMain.handle("stt:stop", async () => {
    drainSttQueue("cancelled");
  });

  // 앱 종료 시 데몬 정리
  app.on("before-quit", () => {
    if (sttDaemon) {
      try { sendSttCommand({ cmd: "quit" }); } catch { /* ignore */ }
      setTimeout(() => { try { sttDaemon?.kill(); } catch { /* ignore */ } }, 1000);
    }
  });
}
