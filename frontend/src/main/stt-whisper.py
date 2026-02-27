"""
Whisper-based Speech-to-Text Daemon for POSON Kiosk
Uses faster-whisper (CTranslate2) for efficient offline multilingual recognition.

Daemon mode: reads JSON commands from stdin, writes JSON results to stdout.
Model is loaded ONCE at startup and reused across requests.

Protocol:
  → stdin:  {"cmd":"recognize","timeout":10,"lang":"ko-KR","vocab":["결제","커피믹스",...]}
  → stdout: {"success":true,"transcript":"커피믹스","confidence":0.82,"engine":"whisper"}

  → stdin:  {"cmd":"ping"}
  → stdout: {"pong":true}

  → stdin:  {"cmd":"quit"}
  → (process exits)
"""
import sys
import os
import io
import json
import queue
import time

# Force UTF-8 stdout/stderr/stdin
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8")

SAMPLE_RATE = 16000
ENERGY_THRESHOLD = 300  # 음성 감지 임계값 (낮을수록 민감)
SILENCE_DURATION = 1.0  # 무음 지속 시 녹음 종료 (초) — 짧은 명령어 응답성 개선

# BCP 47 → Whisper 언어 코드 매핑
LANG_MAP = {
    "ko-KR": "ko",
    "en-US": "en",
    "ja-JP": "ja",
    "zh-CN": "zh",
}

# 언어별 initial_prompt 템플릿 (Whisper에게 문맥 제공)
PROMPT_TEMPLATES = {
    "ko": "키오스크 음성 주문입니다. {vocab}",
    "en": "Kiosk voice ordering. {vocab}",
    "ja": "キオスクの音声注文です。{vocab}",
    "zh": "自助点餐语音点单。{vocab}",
}


def send(obj):
    """Send JSON response to stdout (one line per response)."""
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def record_audio(timeout_sec):
    """Record audio with energy-based VAD, return numpy float32 array or None."""
    try:
        import sounddevice as sd
        import numpy as np
    except ImportError as e:
        return None, 0.0, f"import:{e}"

    audio_queue = queue.Queue()
    has_speech = False
    silence_chunks = 0
    max_silence = int(SILENCE_DURATION * SAMPLE_RATE / 4096)

    def callback(indata, frames, time_info, status):
        audio_queue.put(bytes(indata))

    frames_data = []
    try:
        with sd.RawInputStream(
            samplerate=SAMPLE_RATE,
            blocksize=4096,
            dtype="int16",
            channels=1,
            callback=callback,
        ):
            max_chunks = int(timeout_sec * SAMPLE_RATE / 4096)
            chunk_count = 0

            while chunk_count < max_chunks:
                try:
                    data = audio_queue.get(timeout=0.5)
                except queue.Empty:
                    chunk_count += 1
                    continue

                chunk_count += 1
                frames_data.append(data)

                # Energy-based VAD
                audio_np = np.frombuffer(data, dtype=np.int16)
                energy = np.sqrt(np.mean(audio_np.astype(float) ** 2))

                if energy > ENERGY_THRESHOLD:
                    has_speech = True
                    silence_chunks = 0
                elif has_speech:
                    silence_chunks += 1
                    if silence_chunks >= max_silence:
                        print("[STT] End of speech detected", file=sys.stderr)
                        break

    except Exception as e:
        return None, 0.0, f"mic_error:{e}"

    if not frames_data:
        return None, 0.0, "no_speech"

    # int16 → float32 [-1.0, 1.0] (faster-whisper가 직접 받을 수 있는 형식)
    all_audio = b"".join(frames_data)
    audio_np = np.frombuffer(all_audio, dtype=np.int16).astype(np.float32) / 32768.0
    total_energy = np.sqrt(np.mean((audio_np * 32768.0) ** 2))

    if total_energy < ENERGY_THRESHOLD:
        return None, 0.0, "no_speech"

    duration = len(audio_np) / SAMPLE_RATE
    return audio_np, duration, None


def transcribe(model, audio_np, duration, lang="ko", vocab_words=None):
    """Transcribe numpy float32 audio using pre-loaded Whisper model."""
    t0 = time.time()

    # 짧은 발화 최적화: < 3초면 greedy + VAD 비활성
    is_short = duration < 3.0
    beam = 1 if is_short else 5
    use_vad = not is_short

    # initial_prompt 구성 (언어별 템플릿 적용)
    prompt = None
    if vocab_words:
        template = PROMPT_TEMPLATES.get(lang, PROMPT_TEMPLATES["ko"])
        prompt = template.format(vocab=", ".join(vocab_words[:40]))

    try:
        segments, info = model.transcribe(
            audio_np,
            language=lang,
            beam_size=beam,
            vad_filter=use_vad,
            initial_prompt=prompt,
            # ── 핵심 개선 파라미터 ──
            condition_on_previous_text=False,  # hallucination 방지 ("하나,둘,셋" 반복 제거)
            no_speech_threshold=0.3,           # 짧은 발화도 인식 (기본 0.6이면 짧은 음성 필터됨)
            log_prob_threshold=-0.8,           # 저품질 결과 필터링 완화 (기본 -1.0)
            temperature=0.0,                   # greedy decoding (일관된 결과)
        )

        texts = []
        total_logprob = 0.0
        seg_count = 0
        for seg in segments:
            texts.append(seg.text.strip())
            total_logprob += seg.avg_logprob
            seg_count += 1

        transcript = " ".join(texts).strip()
        confidence = round(
            min(1.0, max(0.0, 1.0 + (total_logprob / max(seg_count, 1)) / 2)), 2
        )

        # temperature fallback: 신뢰도 낮으면 temperature=0.2로 재시도
        if transcript and confidence < 0.4 and not is_short:
            print(f'[STT] Low confidence ({confidence}), retrying with temp=0.2...', file=sys.stderr)
            segments2, _ = model.transcribe(
                audio_np,
                language=lang,
                beam_size=5,
                vad_filter=use_vad,
                initial_prompt=prompt,
                condition_on_previous_text=False,
                no_speech_threshold=0.3,
                temperature=0.2,
            )
            texts2 = []
            logprob2 = 0.0
            cnt2 = 0
            for seg in segments2:
                texts2.append(seg.text.strip())
                logprob2 += seg.avg_logprob
                cnt2 += 1
            t2 = " ".join(texts2).strip()
            c2 = round(min(1.0, max(0.0, 1.0 + (logprob2 / max(cnt2, 1)) / 2)), 2)
            if t2 and c2 > confidence:
                transcript, confidence = t2, c2
                print(f'[STT] Retry result: "{transcript}" (conf={confidence})', file=sys.stderr)

        elapsed = time.time() - t0
        print(
            f'[STT] "{transcript}" (conf={confidence}, '
            f"beam={beam}, vad={use_vad}, {elapsed:.1f}s)",
            file=sys.stderr,
        )

        if transcript:
            return {
                "success": True,
                "transcript": transcript,
                "confidence": confidence,
                "engine": "whisper",
            }
        else:
            return {"success": False, "error": "no_speech"}

    except Exception as e:
        return {"success": False, "error": f"whisper_error:{e}"}


def warmup(model):
    """모델 웜업: 더미 오디오로 첫 인식 지연 제거."""
    import numpy as np

    print("[STT] Warming up model...", file=sys.stderr)
    t0 = time.time()
    dummy = np.zeros(SAMPLE_RATE, dtype=np.float32)  # 1초 무음
    segments, _ = model.transcribe(dummy, language="ko", beam_size=1, vad_filter=False)
    # segments는 lazy iterator이므로 소비해야 실제 실행됨
    for _ in segments:
        pass
    elapsed = time.time() - t0
    print(f"[STT] Warmup done ({elapsed:.1f}s)", file=sys.stderr)


def detect_device():
    """Auto-detect best available device for Whisper (CUDA GPU > CPU)."""
    try:
        import torch
        if torch.cuda.is_available():
            free_mem = torch.cuda.mem_get_info()[0] / (1024**3)
            if free_mem >= 1.5:
                print(f"[STT] CUDA available (free={free_mem:.1f}GB), using GPU", file=sys.stderr)
                return "cuda", "float16"
            else:
                print(f"[STT] CUDA low memory ({free_mem:.1f}GB), falling back to CPU", file=sys.stderr)
    except ImportError:
        pass
    except Exception as e:
        print(f"[STT] CUDA check failed: {e}, falling back to CPU", file=sys.stderr)
    return "cpu", "int8"


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("-model", default="small")
    parser.add_argument("-device", default="auto", choices=["auto", "cpu", "cuda"])
    args = parser.parse_args()

    # ── Detect device ──
    if args.device == "auto":
        device, compute_type = detect_device()
    elif args.device == "cuda":
        device, compute_type = "cuda", "float16"
    else:
        device, compute_type = "cpu", "int8"

    # ── Load model ONCE at startup ──
    print(f"[STT] Loading Whisper model '{args.model}' on {device} ({compute_type})...", file=sys.stderr)
    t0 = time.time()
    try:
        from faster_whisper import WhisperModel

        model = WhisperModel(args.model, device=device, compute_type=compute_type)
        elapsed = time.time() - t0
        print(f"[STT] Model loaded ({elapsed:.1f}s)", file=sys.stderr)
    except RuntimeError as e:
        # GPU 메모리 부족 등 → CPU 폴백
        if device == "cuda":
            print(f"[STT] GPU failed ({e}), falling back to CPU...", file=sys.stderr)
            model = WhisperModel(args.model, device="cpu", compute_type="int8")
            device = "cpu"
            elapsed = time.time() - t0
            print(f"[STT] Model loaded on CPU fallback ({elapsed:.1f}s)", file=sys.stderr)
        else:
            send({"ready": False, "error": str(e)})
            return
    except Exception as e:
        send({"ready": False, "error": str(e)})
        return

    # ── Warmup: 첫 인식 지연 제거 ──
    warmup(model)

    # Signal that daemon is ready
    send({"ready": True, "model": args.model, "device": device})

    # ── Main loop: read commands from stdin ──
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            cmd = json.loads(line)
        except json.JSONDecodeError:
            send({"success": False, "error": "invalid_json"})
            continue

        action = cmd.get("cmd", "")

        if action == "ping":
            send({"pong": True})

        elif action == "quit":
            print("[STT] Quit command received.", file=sys.stderr)
            break

        elif action == "recognize":
            timeout = min(max(cmd.get("timeout", 10), 3), 30)
            vocab = cmd.get("vocab", [])
            # BCP 47 → Whisper 언어 코드 변환
            raw_lang = cmd.get("lang", "ko-KR")
            whisper_lang = LANG_MAP.get(raw_lang, raw_lang.split("-")[0] if "-" in raw_lang else "ko")

            print(
                f"[STT] Recording (lang={whisper_lang}, timeout={timeout}s, vocab={len(vocab)})...",
                file=sys.stderr,
            )

            audio_np, duration, err = record_audio(timeout)
            if err:
                send({"success": False, "error": err})
                continue

            print(f"[STT] Recorded {duration:.1f}s, transcribing...", file=sys.stderr)
            result = transcribe(model, audio_np, duration, whisper_lang, vocab if vocab else None)
            send(result)

        else:
            send({"success": False, "error": f"unknown_cmd:{action}"})

    print("[STT] Daemon exiting.", file=sys.stderr)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        pass
    except KeyboardInterrupt:
        print("[STT] Interrupted.", file=sys.stderr)
    except Exception as e:
        send({"success": False, "error": f"fatal:{e}"})
