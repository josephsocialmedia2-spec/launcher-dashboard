from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.video import make_srt, burn_vertical


def run(cmd: list[str]) -> None:
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError((p.stderr or p.stdout)[-3000:])


def main() -> int:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("FFmpeg/FFprobe non disponibili")

    work = ROOT / "renders" / "_selftest"
    wav = work / "voice.wav"
    if not wav.exists():
        raise RuntimeError("voice.wav mancante: eseguire verify_piper.py prima")

    source = work / "source.mp4"
    final = work / "ffmpeg_test_1080x1920.mp4"
    srt = work / "captions.srt"

    run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "color=c=black:s=512x512:r=25",
        "-i", str(wav),
        "-shortest",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        str(source),
    ])

    make_srt("Ciao, questo è un test di UGC Avatar Studio.", 3.0, srt)
    burn_vertical(source, srt, final)

    p = subprocess.run([
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-of", "json", str(final)
    ], capture_output=True, text=True, check=True)
    data = json.loads(p.stdout)
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    duration = float(data.get("format", {}).get("duration") or 0)

    if not video or not audio:
        raise RuntimeError("Output FFmpeg privo di stream video o audio")
    if int(video.get("width", 0)) != 1080 or int(video.get("height", 0)) != 1920:
        raise RuntimeError(f"Risoluzione errata: {video.get('width')}x{video.get('height')}")
    if duration <= 0 or final.stat().st_size <= 1024:
        raise RuntimeError("Output FFmpeg non valido")

    print(f"FFMPEG_OK path={final} bytes={final.stat().st_size} duration={duration:.3f}s 1080x1920 audio=yes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
