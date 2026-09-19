from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.config import load_config
from services.video import make_srt, burn_vertical
from providers.avatar.sadtalker_provider import SadTalkerProvider


def ffprobe(path: Path) -> dict:
    p = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(p.stdout)


def main() -> int:
    cfg = load_config()
    work = ROOT / "renders" / "_selftest"
    wav = work / "voice.wav"
    if not wav.exists():
        raise RuntimeError("voice.wav mancante: eseguire verify_piper.py prima")

    avcfg = cfg["avatar"]
    repo = ROOT / avcfg["repo"]
    python_exe = ROOT / avcfg["python"]

    preferred = repo / "examples" / "source_image" / "full_body_1.png"
    if preferred.exists():
        image = preferred
    else:
        candidates = sorted((repo / "examples" / "source_image").glob("*.*"))
        if not candidates:
            raise RuntimeError("Nessuna immagine di esempio SadTalker trovata")
        image = candidates[0]

    provider = SadTalkerProvider(repo, python_exe, avcfg.get("enhancer"))
    talking = provider.animate(image, wav, work / "sadtalker")

    data = ffprobe(talking)
    streams = data.get("streams", [])
    if not any(s.get("codec_type") == "video" for s in streams):
        raise RuntimeError("SadTalker non ha prodotto uno stream video")
    if float(data.get("format", {}).get("duration") or 0) <= 0:
        raise RuntimeError("Video SadTalker con durata non valida")

    final = work / "VIDEO_UGC_001.mp4"
    srt = make_srt(
        "Ciao, questo è il primo video generato automaticamente da UGC Avatar Studio.",
        float(data.get("format", {}).get("duration") or 3.0),
        work / "sadtalker_captions.srt",
    )
    burn_vertical(talking, srt, final)

    final_data = ffprobe(final)
    streams = final_data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    duration = float(final_data.get("format", {}).get("duration") or 0)

    if not video or not audio:
        raise RuntimeError("Output finale privo di video o audio")
    if int(video.get("width", 0)) != 1080 or int(video.get("height", 0)) != 1920:
        raise RuntimeError(f"Risoluzione finale errata: {video.get('width')}x{video.get('height')}")
    if duration <= 0 or final.stat().st_size <= 1024:
        raise RuntimeError("VIDEO_UGC_001.mp4 non valido")

    print(
        f"END_TO_END_OK path={final} bytes={final.stat().st_size} "
        f"duration={duration:.3f}s resolution=1080x1920 audio=yes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
