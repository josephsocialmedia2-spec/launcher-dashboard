from __future__ import annotations
from pathlib import Path
import subprocess
class SadTalkerProvider:
    def __init__(self, repo: Path, python_exe: Path, enhancer: str | None = "gfpgan"):
        self.repo=Path(repo); self.python_exe=Path(python_exe); self.enhancer=enhancer
    def validate(self):
        if not self.repo.exists(): raise RuntimeError("SadTalker non installato. Esegui INSTALL_SADTALKER.bat")
        if not self.python_exe.exists(): raise RuntimeError(f"Python SadTalker non trovato: {self.python_exe}")
        if not (self.repo/"inference.py").exists(): raise RuntimeError("inference.py di SadTalker non trovato")
    def animate(self,image:Path,audio:Path,result_dir:Path)->Path:
        self.validate(); result_dir.mkdir(parents=True,exist_ok=True); before=set(result_dir.rglob("*.mp4"))
        cmd=[str(self.python_exe),"inference.py","--driven_audio",str(audio.resolve()),"--source_image",str(image.resolve()),"--result_dir",str(result_dir.resolve()),"--preprocess","full","--still","--batch_size","1"]
        if self.enhancer: cmd += ["--enhancer",self.enhancer]
        p=subprocess.run(cmd,cwd=self.repo,capture_output=True,text=True)
        if p.returncode!=0: raise RuntimeError("SadTalker ha fallito. "+(p.stderr or p.stdout)[-1800:])
        after=set(result_dir.rglob("*.mp4")); created=sorted(after-before,key=lambda x:x.stat().st_mtime) or sorted(after,key=lambda x:x.stat().st_mtime)
        if not created: raise RuntimeError("SadTalker terminato ma nessun MP4 è stato trovato")
        return created[-1]
