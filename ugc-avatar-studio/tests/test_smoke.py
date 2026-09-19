from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from services.video import srt_timestamp, make_srt

def test_timestamp():
    assert srt_timestamp(1.234)=="00:00:01,234"

def test_make_srt(tmp_path: Path):
    out=make_srt("ciao questo e un test",2.0,tmp_path/"x.srt",max_words=3)
    text=out.read_text(encoding="utf-8")
    assert "00:00:00,000" in text
    assert "ciao questo e" in text

def test_home_and_diagnostics():
    client=TestClient(app)
    home=client.get("/")
    assert home.status_code==200
    assert "UGC AVATAR STUDIO" in home.text
    d=client.get("/api/diagnostics")
    assert d.status_code==200
    body=d.json()
    assert "python" in body
    assert body["config"]["tts"]=="piper"
