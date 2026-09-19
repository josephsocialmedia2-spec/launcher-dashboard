from __future__ import annotations

import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.config import load_config
from providers.tts.piper_provider import PiperTTSProvider


def main() -> int:
    cfg = load_config()
    out_dir = ROOT / "renders" / "_selftest"
    out_dir.mkdir(parents=True, exist_ok=True)
    wav = out_dir / "voice.wav"
    tts = PiperTTSProvider(ROOT / cfg["tts"]["model"], ROOT / cfg["tts"]["config"])
    tts.synthesize("Ciao, questo è un test di UGC Avatar Studio.", wav, speed=1.0)

    if not wav.exists() or wav.stat().st_size <= 1024:
        raise RuntimeError("Piper non ha prodotto un WAV valido")

    with wave.open(str(wav), "rb") as audio:
        frames = audio.getnframes()
        rate = audio.getframerate()
        channels = audio.getnchannels()
        width = audio.getsampwidth()
        duration = frames / float(rate) if rate else 0.0

    if frames <= 0 or rate <= 0 or channels <= 0 or width <= 0 or duration <= 0:
        raise RuntimeError("WAV Piper non valido")

    print(f"PIPER_OK path={wav} bytes={wav.stat().st_size} duration={duration:.3f}s rate={rate} channels={channels}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
