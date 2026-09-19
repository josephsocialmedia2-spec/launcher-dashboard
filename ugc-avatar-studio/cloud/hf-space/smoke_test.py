from pathlib import Path
import os

os.environ["UGC_SKIP_PREWARM"] = "1"

from fastapi.testclient import TestClient
import app

readme = Path("README.md").read_text(encoding="utf-8")
assert "sdk: gradio" in readme
assert "app_file: app.py" in readme
assert "python_version: 3.10.13" in readme

client = TestClient(app.app)
for path in ("/health", "/api/diagnostics"):
    response = client.get(path)
    assert response.status_code == 200, (path, response.status_code, response.text)
    body = response.json()
    assert body["tts"] == "piper"
    assert body["avatar"] == "sadtalker"

print("UGC_AVATAR_CLOUD_SMOKE_OK")
