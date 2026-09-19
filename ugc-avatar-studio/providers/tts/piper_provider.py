from __future__ import annotations
from pathlib import Path
import subprocess, sys
class PiperTTSProvider:
    def __init__(self, model: Path, config: Path):
        self.model=Path(model); self.config=Path(config)
    def validate(self):
        missing=[str(p) for p in (self.model,self.config) if not p.exists()]
        if missing: raise RuntimeError("Modello Piper mancante: "+", ".join(missing)+". Esegui DOWNLOAD_MODELS.bat")
    def synthesize(self,text:str,output_wav:Path,speed:float=1.0):
        self.validate(); length_scale=max(0.5,min(2.0,1.0/max(speed,0.1)))
        cmd=[sys.executable,"-m","piper","-m",str(self.model),"--config",str(self.config),"--output-file",str(output_wav),"--length-scale",str(length_scale),"--",text]
        p=subprocess.run(cmd,capture_output=True,text=True)
        if p.returncode!=0: raise RuntimeError("Piper TTS non ha generato l'audio. "+(p.stderr or p.stdout)[-1200:])
        if not output_wav.exists() or output_wav.stat().st_size<1024: raise RuntimeError("Piper ha terminato senza produrre un WAV valido")
        return output_wav
