from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import uuid
from pathlib import Path

try:
    import spaces  # Hugging Face ZeroGPU runtime
except ImportError:
    class _SpacesFallback:
        @staticmethod
        def GPU(*args, **kwargs):
            def decorator(fn):
                return fn
            return decorator
    spaces = _SpacesFallback()

import gradio as gr
from fastapi import FastAPI
from PIL import Image
import requests

APP_NAME = "UGC AVATAR STUDIO"
RUNTIME = Path(os.environ.get("UGC_RUNTIME_DIR", "/tmp/ugc-avatar-studio"))
MODELS = RUNTIME / "models"
OUTPUTS = RUNTIME / "outputs"
SADTALKER = RUNTIME / "SadTalker"
PIPER_MODEL = MODELS / "it_IT-paola-medium.onnx"
PIPER_CONFIG = MODELS / "it_IT-paola-medium.onnx.json"

PIPER_URLS = {
    PIPER_MODEL: "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium.onnx",
    PIPER_CONFIG: "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium.onnx.json",
}

CHECKPOINT_URLS = {
    "mapping_00109-model.pth.tar": "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00109-model.pth.tar",
    "mapping_00229-model.pth.tar": "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/mapping_00229-model.pth.tar",
    "SadTalker_V0.0.2_256.safetensors": "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_256.safetensors",
    "SadTalker_V0.0.2_512.safetensors": "https://github.com/OpenTalker/SadTalker/releases/download/v0.0.2-rc/SadTalker_V0.0.2_512.safetensors",
}

ASSET_LOCK = threading.Lock()
ASSETS_READY = False
ASSET_ERROR: str | None = None

os.environ.setdefault("TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD", "1")


def _run(cmd: list[str], *, cwd: Path | None = None, timeout: int | None = None) -> subprocess.CompletedProcess:
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    if p.returncode != 0:
        detail = (p.stderr or p.stdout or "")[-5000:]
        raise RuntimeError(f"Command failed ({p.returncode}): {' '.join(cmd[:4])}\n{detail}")
    return p


def _download(url: str, dst: Path) -> None:
    if dst.exists() and dst.stat().st_size > 1024:
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_suffix(dst.suffix + ".part")
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with tmp.open("wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
    if tmp.stat().st_size <= 1024:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"Download non valido: {url}")
    tmp.replace(dst)


def ensure_assets() -> None:
    global ASSETS_READY, ASSET_ERROR
    if ASSETS_READY:
        return
    with ASSET_LOCK:
        if ASSETS_READY:
            return
        try:
            RUNTIME.mkdir(parents=True, exist_ok=True)
            MODELS.mkdir(parents=True, exist_ok=True)
            OUTPUTS.mkdir(parents=True, exist_ok=True)

            if not (SADTALKER / "inference.py").exists():
                if SADTALKER.exists():
                    shutil.rmtree(SADTALKER, ignore_errors=True)
                _run(["git", "clone", "--depth", "1", "https://github.com/OpenTalker/SadTalker.git", str(SADTALKER)], timeout=180)

            for dst, url in PIPER_URLS.items():
                _download(url, dst)

            checkpoints = SADTALKER / "checkpoints"
            checkpoints.mkdir(parents=True, exist_ok=True)
            for name, url in CHECKPOINT_URLS.items():
                _download(url, checkpoints / name)

            ASSETS_READY = True
            ASSET_ERROR = None
        except Exception as exc:
            ASSET_ERROR = str(exc)
            raise


def prewarm() -> None:
    try:
        ensure_assets()
    except Exception:
        pass


def cleanup_old_outputs(max_age_hours: int = 6) -> None:
    if not OUTPUTS.exists():
        return
    cutoff = time.time() - max_age_hours * 3600
    for item in OUTPUTS.iterdir():
        try:
            if item.stat().st_mtime < cutoff:
                if item.is_dir():
                    shutil.rmtree(item, ignore_errors=True)
                else:
                    item.unlink(missing_ok=True)
        except OSError:
            pass


def synthesize_piper(text: str, out_wav: Path, speed: float) -> None:
    length_scale = max(0.5, min(2.0, 1.0 / max(speed, 0.1)))
    p = subprocess.run(
        [
            sys.executable,
            "-m",
            "piper",
            "-m",
            str(PIPER_MODEL),
            "--config",
            str(PIPER_CONFIG),
            "--output-file",
            str(out_wav),
            "--length-scale",
            str(length_scale),
            "--",
            text,
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    if p.returncode != 0 or not out_wav.exists() or out_wav.stat().st_size <= 1024:
        raise RuntimeError("Piper TTS non ha generato un WAV valido. " + (p.stderr or p.stdout or "")[-1600:])


def run_sadtalker(image: Path, audio: Path, result_dir: Path) -> Path:
    result_dir.mkdir(parents=True, exist_ok=True)
    before = set(result_dir.rglob("*.mp4"))
    cmd = [
        sys.executable,
        "inference.py",
        "--driven_audio",
        str(audio.resolve()),
        "--source_image",
        str(image.resolve()),
        "--result_dir",
        str(result_dir.resolve()),
        "--preprocess",
        "crop",
        "--size",
        "256",
        "--still",
        "--batch_size",
        "1",
    ]
    p = subprocess.run(cmd, cwd=SADTALKER, capture_output=True, text=True, timeout=240)
    if p.returncode != 0:
        raise RuntimeError("SadTalker ha fallito. " + (p.stderr or p.stdout or "")[-3000:])
    after = set(result_dir.rglob("*.mp4"))
    created = sorted(after - before, key=lambda x: x.stat().st_mtime)
    if not created:
        created = sorted(after, key=lambda x: x.stat().st_mtime)
    if not created:
        raise RuntimeError("SadTalker terminato senza produrre un MP4.")
    return created[-1]


def probe(path: Path) -> dict:
    p = _run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        timeout=30,
    )
    return json.loads(p.stdout)


def make_srt(text: str, duration: float, out: Path, max_words: int = 7) -> Path:
    words = text.split()
    chunks = [words[i:i + max_words] for i in range(0, len(words), max_words)] or [[""]]
    duration = max(duration, 1.0)
    each = duration / len(chunks)

    def ts(seconds: float) -> str:
        ms = int(round(seconds * 1000))
        h, rem = divmod(ms, 3_600_000)
        m, rem = divmod(rem, 60_000)
        s, ms = divmod(rem, 1000)
        return f"{h:02}:{m:02}:{s:02},{ms:03}"

    rows: list[str] = []
    for i, chunk in enumerate(chunks, start=1):
        rows.extend([
            str(i),
            f"{ts((i - 1) * each)} --> {ts(min(duration, i * each))}",
            " ".join(chunk),
            "",
        ])
    out.write_text("\n".join(rows), encoding="utf-8")
    return out


def compose_vertical(source: Path, srt: Path, output: Path) -> None:
    srt_escaped = str(srt.resolve()).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    vf = (
        "scale=1080:1920:force_original_aspect_ratio=decrease,"
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,"
        f"subtitles='{srt_escaped}':force_style='FontSize=22,Outline=2,Alignment=2,MarginV=110'"
    )
    _run([
        "ffmpeg", "-y", "-i", str(source), "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
        "-c:a", "aac", "-b:a", "192k", str(output)
    ], timeout=180)


def validate_final(path: Path) -> dict:
    data = probe(path)
    streams = data.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    audio = next((s for s in streams if s.get("codec_type") == "audio"), None)
    duration = float(data.get("format", {}).get("duration") or 0)
    if not video or not audio:
        raise RuntimeError("Output finale privo di stream audio o video.")
    if int(video.get("width", 0)) != 1080 or int(video.get("height", 0)) != 1920:
        raise RuntimeError(f"Risoluzione finale errata: {video.get('width')}x{video.get('height')}")
    if duration <= 0 or path.stat().st_size <= 1024:
        raise RuntimeError("Output MP4 finale non valido.")
    return {"duration": duration, "width": 1080, "height": 1920}


def copy_and_validate_image(source: str, dst: Path) -> None:
    src = Path(source)
    if not src.exists() or src.stat().st_size == 0:
        raise ValueError("Foto non valida.")
    if src.stat().st_size > 10 * 1024 * 1024:
        raise ValueError("La foto supera il limite di 10 MB.")
    with Image.open(src) as im:
        if im.format not in {"JPEG", "PNG", "WEBP"}:
            raise ValueError("Formato immagine non supportato.")
        if im.width > 8000 or im.height > 8000:
            raise ValueError("Immagine troppo grande.")
        im.convert("RGB").save(dst, "JPEG", quality=95)


@spaces.GPU(duration=180)
def generate_video(photo: str, script: str, speed: float, consent: bool):
    cleanup_old_outputs()
    if not consent:
        raise gr.Error("Devi confermare di possedere i diritti e il consenso per la foto utilizzata.")
    script = (script or "").strip()
    if len(script) < 3:
        raise gr.Error("Inserisci uno script valido.")
    if len(script) > 1500:
        raise gr.Error("Lo script è troppo lungo: massimo 1500 caratteri.")
    if not photo:
        raise gr.Error("Carica una foto.")

    ensure_assets()
    job_id = uuid.uuid4().hex[:12]
    work = OUTPUTS / job_id
    work.mkdir(parents=True, exist_ok=False)

    image = work / "avatar.jpg"
    wav = work / "voice.wav"
    sadtalker_dir = work / "sadtalker"
    srt = work / "captions.srt"
    final = work / "VIDEO_UGC_001.mp4"

    try:
        copy_and_validate_image(photo, image)
        synthesize_piper(script, wav, float(speed))
        talking = run_sadtalker(image, wav, sadtalker_dir)
        talk_info = probe(talking)
        duration = float(talk_info.get("format", {}).get("duration") or 0)
        make_srt(script, duration, srt)
        compose_vertical(talking, srt, final)
        meta = validate_final(final)
        status = (
            f"✅ Video generato. Job {job_id} · "
            f"{meta['width']}×{meta['height']} · {meta['duration']:.1f}s"
        )
        return str(final), status, job_id
    except Exception:
        shutil.rmtree(work, ignore_errors=True)
        raise


def diagnostics() -> dict:
    gpu = None
    try:
        p = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if p.returncode == 0:
            gpu = p.stdout.strip() or None
    except Exception:
        pass

    return {
        "status": "ok" if ASSETS_READY and not ASSET_ERROR else ("error" if ASSET_ERROR else "warming"),
        "tts": "piper",
        "avatar": "sadtalker",
        "ffmpeg": bool(shutil.which("ffmpeg")),
        "gpu": gpu,
        "cuda": bool(gpu),
        "models": "ready" if ASSETS_READY else ("error" if ASSET_ERROR else "warming"),
        "queue": "gradio",
    }


api = FastAPI(title=APP_NAME)


@api.get("/health")
def health():
    return diagnostics()


@api.get("/api/diagnostics")
def api_diagnostics():
    return diagnostics()


with gr.Blocks(
    title=APP_NAME,
    css="""
    .gradio-container {max-width: 1080px !important; margin: 0 auto !important;}
    .ugc-title {font-weight: 800; letter-spacing: -0.03em;}
    """
) as demo:
    gr.Markdown("# UGC AVATAR STUDIO", elem_classes=["ugc-title"])
    gr.Markdown("Carica una foto autorizzata, scrivi il testo e genera un video UGC verticale interamente nel cloud.")
    with gr.Row():
        with gr.Column():
            photo = gr.Image(type="filepath", label="Foto avatar", sources=["upload"])
            script = gr.Textbox(
                label="Testo",
                lines=7,
                placeholder="Scrivi qui ciò che deve dire l'avatar…",
                max_lines=12,
            )
            speed = gr.Slider(0.85, 1.15, value=1.0, step=0.05, label="Velocità voce")
            consent = gr.Checkbox(
                label="Confermo di possedere i diritti e il consenso necessari per usare questa immagine."
            )
            generate = gr.Button("GENERA VIDEO", variant="primary")
        with gr.Column():
            status = gr.Textbox(label="Stato", value="Motore cloud in preparazione…", interactive=False)
            job = gr.Textbox(label="Job ID", interactive=False)
            video = gr.Video(label="Video generato", format="mp4")

    generate.click(
        fn=generate_video,
        inputs=[photo, script, speed, consent],
        outputs=[video, status, job],
        api_name="generate_video",
    )

demo.queue(default_concurrency_limit=1, max_size=20)
app = gr.mount_gradio_app(api, demo, path="/")

if os.environ.get("UGC_SKIP_PREWARM") != "1":
    threading.Thread(target=prewarm, daemon=True).start()

if __name__ == "__main__":
    # ZeroGPU reserves the PORT env value (commonly 7861) for its internal proxy.
    # Gradio Spaces are publicly served from 7860, so bind the combined
    # FastAPI + Gradio application there explicitly.
    try:
        from spaces.zero import startup as zero_startup
        zero_startup()
        print("zerogpu: startup report sent", flush=True)
    except ImportError:
        pass

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
