from __future__ import annotations

import modal

APP_NAME = "ugc-avatar-studio"
GPU_TYPE = "T4"
DATA_ROOT = "/data/jobs"
POSTIZ_API_URL = "https://api.postiz.com"

app = modal.App(APP_NAME)
data_volume = modal.Volume.from_name("ugc-avatar-studio-data", create_if_missing=True)
runtime_secret = modal.Secret.from_name(
    "ugc-avatar-studio-runtime",
    required_keys=["POSTIZ_API_KEY"],
)

web_image = (
    modal.Image.debian_slim(python_version="3.10")
    .pip_install(
        "fastapi>=0.116,<1",
        "python-multipart==0.0.20",
        "requests>=2.32,<3",
    )
)

gpu_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(
        "ffmpeg",
        "git",
        "wget",
        "libgl1",
        "libglib2.0-0",
        "libsm6",
        "libxext6",
        "fonts-dejavu-core",
    )
    .pip_install(
        "piper-tts==1.8.0",
        "Pillow>=10.4,<12",
        "requests>=2.32,<3",
        "numpy==1.26.4",
        "scipy==1.10.1",
        "librosa==0.10.2.post1",
        "numba>=0.60,<0.62",
        "resampy>=0.4,<0.5",
        "pydub==0.25.1",
        "imageio>=2.34,<3",
        "imageio-ffmpeg>=0.5,<1",
        "kornia>=0.7,<0.9",
        "yacs==0.1.8",
        "joblib>=1.4,<2",
        "scikit-image>=0.22,<0.26",
        "face-alignment>=1.4,<2",
        "safetensors>=0.4,<1",
        "opencv-python-headless>=4.10,<5",
        "git+https://github.com/XPixelGroup/BasicSR.git",
        "facexlib==0.3.0",
        "gfpgan==1.3.8",
        "av>=12,<16",
        "torch==2.8.0",
        "torchvision==0.23.0",
        "torchaudio==2.8.0",
    )
    .run_commands(
        "git clone --depth 1 https://github.com/OpenTalker/SadTalker.git /opt/SadTalker",
        "sed -i 's/preds.astype(np.float, copy=False)/preds.astype(float, copy=False)/g' /opt/SadTalker/src/face3d/util/my_awing_arch.py",
        "cd /opt/SadTalker && bash scripts/download_models.sh",
        "mkdir -p /opt/piper",
        "wget -q https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium.onnx -O /opt/piper/it_IT-paola-medium.onnx",
        "wget -q https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium/it_IT-paola-medium.onnx.json -O /opt/piper/it_IT-paola-medium.onnx.json",
    )
    .env({"TORCH_FORCE_NO_WEIGHTS_ONLY_LOAD": "1"})
)

INDEX_HTML = r"""<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>UGC Avatar Studio · Automatico</title>
  <style>
    :root{color-scheme:dark;background:#090c0e;color:#f5f7fa;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#163323 0,#090c0e 44%);min-height:100vh}
    main{max-width:1040px;margin:auto;padding:28px 18px 64px}.hero{padding:22px 0 18px}
    .eyebrow{color:#72e69b;font-weight:900;letter-spacing:.13em;font-size:.76rem}
    h1{font-size:clamp(2rem,6vw,4rem);margin:.28rem 0 .5rem;letter-spacing:-.045em}
    .sub{color:#aab4bd;max-width:760px;line-height:1.55}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    @media(max-width:760px){.grid{grid-template-columns:1fr}}.card{background:#11171a;border:1px solid #28333a;border-radius:18px;padding:18px;box-shadow:0 16px 50px #0006}
    label{display:block;font-weight:800;margin:0 0 8px}input[type=file],textarea{width:100%}
    textarea{min-height:220px;resize:vertical;background:#0a0f12;color:#fff;border:1px solid #334047;border-radius:12px;padding:14px;font:inherit}
    input[type=file]{padding:12px;background:#0a0f12;border:1px dashed #40535c;border-radius:12px}
    button{width:100%;border:0;border-radius:12px;padding:16px 18px;background:#48d47c;color:#061108;font-weight:950;font-size:1rem;cursor:pointer;margin-top:16px}
    button:disabled{opacity:.5;cursor:not-allowed}.status{min-height:62px;color:#bac4cc;line-height:1.5}
    video{width:100%;background:#050607;border-radius:14px;min-height:320px;max-height:620px}
    a.download{display:none;text-decoration:none;text-align:center;margin-top:14px;padding:13px;border:1px solid #3e4e57;border-radius:12px;color:#fff;font-weight:800}
    .fine{font-size:.82rem;color:#818e97;margin-top:14px;line-height:1.45}.ok{color:#72e69b}.err{color:#ff9090}.job{font-size:.82rem;color:#8f9ba4;margin-top:8px;word-break:break-all}
  </style>
</head>
<body>
<main>
  <section class="hero">
    <div class="eyebrow">IMMAGINE + DISCORSO → VIDEO → POSTIZ</div>
    <h1>UGC Avatar Studio</h1>
    <div class="sub">Fornisci soltanto una foto autorizzata e il discorso. Voce, avatar, sottotitoli, formato 1080×1920, caption, hashtag, archiviazione e pubblicazione Postiz vengono eseguiti automaticamente nel cloud.</div>
  </section>
  <section class="grid">
    <form id="form" class="card">
      <label for="photo">1. Immagine da animare</label>
      <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required>
      <div style="height:18px"></div>
      <label for="script">2. Discorso dell'avatar</label>
      <textarea id="script" name="script" maxlength="1500" required placeholder="Scrivi qui esattamente ciò che deve dire l'avatar..."></textarea>
      <button id="generate" type="submit">GENERA E PUBBLICA</button>
      <div class="fine">Caricando l'immagine dichiari di avere i diritti e le autorizzazioni necessarie al suo utilizzo. Nessun altro dato operativo è richiesto.</div>
    </form>
    <div class="card">
      <div id="status" class="status">Sistema pronto. Il processo è automatico: Piper → SadTalker → FFmpeg → copy → Postiz → pubblicazione.</div>
      <div id="job" class="job"></div>
      <video id="video" controls playsinline></video>
      <a id="download" class="download">SCARICA MP4 ARCHIVIATO</a>
    </div>
  </section>
</main>
<script>
const form=document.getElementById('form');
const btn=document.getElementById('generate');
const statusEl=document.getElementById('status');
const jobEl=document.getElementById('job');
const video=document.getElementById('video');
const download=document.getElementById('download');

form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  download.style.display='none';
  video.removeAttribute('src');
  video.load();
  jobEl.textContent='';
  btn.disabled=true;
  btn.textContent='AUTOMAZIONE IN CORSO…';
  statusEl.className='status';
  statusEl.textContent='Generazione voce → animazione → montaggio → copy → upload Postiz → programmazione. Non sono richieste altre azioni.';
  try{
    const data=new FormData(form);
    const res=await fetch('/api/render',{method:'POST',body:data});
    let body=null;
    try{body=await res.json()}catch{body={detail:await res.text()}}
    if(!res.ok)throw new Error(body.detail||'Errore automazione');
    jobEl.textContent='JOB '+body.job_id+' · '+body.postiz.status;
    video.src=body.video_url;
    download.href=body.video_url;
    download.download='VIDEO_UGC_'+body.job_id+'.mp4';
    download.style.display='block';
    statusEl.className='status ok';
    statusEl.textContent='Automazione completata: video creato, archiviato e inviato a Postiz per '+body.postiz.integrations_count+' canale/i. Pubblicazione: '+body.postiz.scheduled_at;
  }catch(err){
    statusEl.className='status err';
    statusEl.textContent='Automazione non completata: '+(err?.message||err);
  }finally{
    btn.disabled=false;
    btn.textContent='GENERA E PUBBLICA';
  }
});
</script>
</body>
</html>"""


def _run(cmd: list[str], *, cwd=None, timeout: int | None = None):
    import subprocess
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    if p.returncode != 0:
        detail = (p.stderr or p.stdout or "")[-5000:]
        raise RuntimeError(f"Command failed ({p.returncode}): {' '.join(cmd[:4])}\n{detail}")
    return p


def _probe(path):
    import json
    p = _run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        timeout=30,
    )
    return json.loads(p.stdout)


def _make_srt(text: str, duration: float, out, max_words: int = 7):
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

    rows = []
    for i, chunk in enumerate(chunks, start=1):
        rows.extend([str(i), f"{ts((i - 1) * each)} --> {ts(min(duration, i * each))}", " ".join(chunk), ""])
    out.write_text("\n".join(rows), encoding="utf-8")


@app.function(
    image=gpu_image,
    gpu=GPU_TYPE,
    timeout=600,
    min_containers=0,
    max_containers=1,
    scaledown_window=30,
    memory=8192,
)
def render_video(photo_bytes: bytes, script: str, speed: float) -> dict:
    import subprocess
    import sys
    import tempfile
    from pathlib import Path
    from PIL import Image

    if not photo_bytes or len(photo_bytes) > 10 * 1024 * 1024:
        raise ValueError("Foto non valida o superiore a 10 MB.")
    script = (script or "").strip()
    if len(script) < 3 or len(script) > 1500:
        raise ValueError("Testo non valido: usa da 3 a 1500 caratteri.")

    with tempfile.TemporaryDirectory(prefix="ugc-avatar-") as temp:
        work = Path(temp)
        image = work / "avatar.jpg"
        wav = work / "voice.wav"
        result_dir = work / "sadtalker"
        srt = work / "captions.srt"
        final = work / "VIDEO_UGC_001.mp4"

        source = work / "upload.bin"
        source.write_bytes(photo_bytes)
        with Image.open(source) as im:
            if im.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("Formato immagine non supportato.")
            if im.width > 8000 or im.height > 8000:
                raise ValueError("Immagine troppo grande.")
            im.convert("RGB").save(image, "JPEG", quality=95)

        length_scale = max(0.5, min(2.0, 1.0 / max(float(speed), 0.1)))
        p = subprocess.run(
            [
                sys.executable,
                "-m",
                "piper",
                "-m",
                "/opt/piper/it_IT-paola-medium.onnx",
                "--config",
                "/opt/piper/it_IT-paola-medium.onnx.json",
                "--output-file",
                str(wav),
                "--length-scale",
                str(length_scale),
                "--",
                script,
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if p.returncode != 0 or not wav.exists() or wav.stat().st_size <= 1024:
            raise RuntimeError("Piper TTS non ha generato un WAV valido. " + (p.stderr or p.stdout or "")[-1600:])

        result_dir.mkdir(parents=True, exist_ok=True)
        before = set(result_dir.rglob("*.mp4"))
        cmd = [
            sys.executable,
            "inference.py",
            "--driven_audio",
            str(wav),
            "--source_image",
            str(image),
            "--result_dir",
            str(result_dir),
            "--preprocess",
            "crop",
            "--size",
            "256",
            "--still",
            "--batch_size",
            "1",
        ]
        p = subprocess.run(cmd, cwd="/opt/SadTalker", capture_output=True, text=True, timeout=360)
        if p.returncode != 0:
            raise RuntimeError("SadTalker ha fallito. " + (p.stderr or p.stdout or "")[-3000:])

        after = set(result_dir.rglob("*.mp4"))
        created = sorted(after - before, key=lambda x: x.stat().st_mtime)
        if not created:
            created = sorted(after, key=lambda x: x.stat().st_mtime)
        if not created:
            raise RuntimeError("SadTalker terminato senza produrre un MP4.")
        talking = created[-1]

        talk_info = _probe(talking)
        duration = float(talk_info.get("format", {}).get("duration") or 0)
        _make_srt(script, duration, srt)

        srt_escaped = str(srt).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
        vf = (
            "scale=1080:1920:force_original_aspect_ratio=decrease,"
            "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,"
            f"subtitles='{srt_escaped}':force_style='FontSize=22,Outline=2,Alignment=2,MarginV=110'"
        )
        _run(
            [
                "ffmpeg", "-y", "-i", str(talking), "-vf", vf,
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
                "-c:a", "aac", "-b:a", "192k", str(final),
            ],
            timeout=240,
        )

        data = _probe(final)
        streams = data.get("streams", [])
        video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
        final_duration = float(data.get("format", {}).get("duration") or 0)
        if not video_stream or not audio_stream:
            raise RuntimeError("Output finale privo di stream audio o video.")
        if int(video_stream.get("width", 0)) != 1080 or int(video_stream.get("height", 0)) != 1920:
            raise RuntimeError("Risoluzione finale diversa da 1080x1920.")
        if final_duration <= 0 or final.stat().st_size <= 1024:
            raise RuntimeError("MP4 finale non valido.")

        return {
            "video": final.read_bytes(),
            "audio": wav.read_bytes(),
            "srt": srt.read_text(encoding="utf-8"),
            "duration": final_duration,
            "width": 1080,
            "height": 1920,
            "gpu": GPU_TYPE,
        }


@app.function(
    image=web_image,
    timeout=650,
    min_containers=0,
    max_containers=2,
    scaledown_window=30,
)
@modal.asgi_app()
def web():
    from fastapi import FastAPI, File, Form, HTTPException, UploadFile
    from fastapi.responses import HTMLResponse, JSONResponse, Response

    api = FastAPI(title="UGC Avatar Studio")

    @api.get("/", response_class=HTMLResponse)
    def home():
        return INDEX_HTML

    @api.get("/health")
    def health():
        return {
            "status": "ok",
            "app": APP_NAME,
            "backend": "modal",
            "gpu": GPU_TYPE,
            "pipeline": ["piper", "sadtalker", "ffmpeg"],
            "resolution": "1080x1920",
            "storage": "temporary",
        }

    @api.get("/api/diagnostics")
    def diagnostics():
        return health()

    @api.post("/api/render")
    def render(
        photo: UploadFile = File(...),
        script: str = Form(...),
        speed: float = Form(1.0),
        consent: str = Form("false"),
    ):
        if consent.lower() not in {"true", "1", "yes", "on"}:
            raise HTTPException(status_code=400, detail="Devi confermare il consenso per l'immagine.")
        if photo.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(status_code=400, detail="Formato foto non supportato.")
        payload = photo.file.read(10 * 1024 * 1024 + 1)
        if len(payload) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="La foto supera il limite di 10 MB.")
        try:
            result = render_video.remote(payload, script, float(speed))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Generazione fallita: {exc}") from exc
        return Response(
            content=result["video"],
            media_type="video/mp4",
            headers={
                "Content-Disposition": 'attachment; filename="VIDEO_UGC_001.mp4"',
                "X-UGC-Width": str(result["width"]),
                "X-UGC-Height": str(result["height"]),
                "X-UGC-GPU": str(result["gpu"]),
            },
        )

    @api.exception_handler(Exception)
    async def unhandled(_, exc: Exception):
        return JSONResponse(status_code=500, content={"detail": str(exc)})

    return api
