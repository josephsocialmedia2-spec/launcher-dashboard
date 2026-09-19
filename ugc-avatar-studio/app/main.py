from __future__ import annotations
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import uuid, shutil, datetime

from services.config import ROOT, load_config
from services.hardware import diagnostics
from services.video import probe_duration, make_srt, burn_vertical
from services.db import init_db, save_render
from providers.tts.piper_provider import PiperTTSProvider
from providers.avatar.sadtalker_provider import SadTalkerProvider

STATIC_DIR = ROOT/"static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="UGC AVATAR STUDIO")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
init_db()

@app.get("/", response_class=HTMLResponse)
def home():
    return (ROOT/"templates"/"index.html").read_text(encoding="utf-8")

@app.get("/api/diagnostics")
def api_diagnostics():
    cfg = load_config()
    d = diagnostics()
    d["config"] = {"tts": cfg.get("tts",{}).get("provider"), "avatar": cfg.get("avatar",{}).get("provider")}
    return d

@app.post("/api/render")
async def render(avatar: UploadFile = File(...), script: str = Form(...), speed: float = Form(1.0), consent: bool = Form(False)):
    if not consent:
        raise HTTPException(400, "Devi confermare di possedere i diritti/consenso per volto e voce utilizzati.")
    if len(script.strip()) < 3:
        raise HTTPException(400, "Script troppo corto")
    rid = datetime.datetime.now().strftime("%Y%m%d_%H%M%S_") + uuid.uuid4().hex[:8]
    work = ROOT/"renders"/rid
    work.mkdir(parents=True, exist_ok=True)
    ext = Path(avatar.filename or "avatar.png").suffix.lower() or ".png"
    image = work/("avatar"+ext)
    with image.open("wb") as f:
        shutil.copyfileobj(avatar.file, f)
    audio = work/"voice.wav"
    final = work/"VIDEO_UGC_001.mp4"
    cfg=load_config()
    try:
        tts=PiperTTSProvider(ROOT/cfg["tts"]["model"], ROOT/cfg["tts"]["config"])
        tts.synthesize(script.strip(), audio, speed=speed)
        avcfg=cfg["avatar"]
        py = Path(avcfg["python"])
        if not py.is_absolute(): py = ROOT/py
        repo = Path(avcfg["repo"])
        if not repo.is_absolute(): repo = ROOT/repo
        avatar_provider=SadTalkerProvider(repo, py, avcfg.get("enhancer"))
        talking=avatar_provider.animate(image, audio, work/"sadtalker")
        srt=make_srt(script.strip(), probe_duration(talking), work/"captions.srt")
        burn_vertical(talking, srt, final)
        save_render((rid, datetime.datetime.now().isoformat(), script.strip(), str(image), str(final), "done", None))
        return {"id": rid, "status":"done", "download": f"/api/render/{rid}/download"}
    except Exception as e:
        save_render((rid, datetime.datetime.now().isoformat(), script.strip(), str(image), None, "error", str(e)))
        raise HTTPException(500, str(e))

@app.get("/api/render/{rid}/download")
def download(rid: str):
    path=ROOT/"renders"/rid/"VIDEO_UGC_001.mp4"
    if not path.exists():
        raise HTTPException(404, "Video non trovato")
    return FileResponse(path, media_type="video/mp4", filename="VIDEO_UGC_001.mp4")
