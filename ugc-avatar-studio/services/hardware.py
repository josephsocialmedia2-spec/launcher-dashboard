from __future__ import annotations
import platform, shutil, subprocess
import psutil
def _run(cmd):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        return (p.stdout or p.stderr).strip() if p.returncode == 0 else None
    except Exception:
        return None
def diagnostics() -> dict:
    gpu = _run(["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader"])
    return {
        "os": platform.platform(),
        "python": platform.python_version(),
        "cpu": platform.processor() or platform.machine(),
        "ram_gb": round(psutil.virtual_memory().total / (1024**3), 1),
        "disk_free_gb": round(psutil.disk_usage('.').free / (1024**3), 1),
        "ffmpeg": bool(shutil.which("ffmpeg")),
        "git": bool(shutil.which("git")),
        "nvidia": gpu,
        "recommended_mode": "QUALITY" if gpu and any(x in gpu for x in ["24","32","48","80"]) else ("STANDARD" if gpu else "ECO")
    }
