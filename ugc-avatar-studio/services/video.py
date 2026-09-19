from __future__ import annotations
from pathlib import Path
import subprocess, re, shutil
def probe_duration(path: Path) -> float:
    p = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",str(path)], capture_output=True, text=True)
    try: return float(p.stdout.strip())
    except Exception: return 0.0
def srt_timestamp(seconds: float) -> str:
    ms = int(round(seconds*1000)); h,rem=divmod(ms,3600000); m,rem=divmod(rem,60000); s,ms=divmod(rem,1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
def make_srt(text: str, duration: float, out: Path, max_words: int = 7) -> Path:
    words=re.findall(r"\S+",text)
    if not words:
        out.write_text("",encoding="utf-8"); return out
    chunks=[words[i:i+max_words] for i in range(0,len(words),max_words)]
    dur=duration or max(2.0,len(words)/2.4); each=dur/len(chunks); rows=[]
    for i,chunk in enumerate(chunks,1):
        rows += [str(i), f"{srt_timestamp((i-1)*each)} --> {srt_timestamp(min(dur,i*each))}", " ".join(chunk), ""]
    out.write_text("\n".join(rows),encoding="utf-8"); return out
def burn_vertical(input_mp4: Path, srt: Path, output_mp4: Path) -> Path:
    if not shutil.which("ffmpeg"): raise RuntimeError("FFmpeg non trovato nel PATH")
    srt_escaped=str(srt.resolve()).replace('\\','/').replace(':','\\:').replace("'","\\'")
    vf=("scale=1080:1920:force_original_aspect_ratio=decrease,"
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,"
        f"subtitles='{srt_escaped}':force_style='FontSize=22,Outline=2,Alignment=2,MarginV=110'")
    p=subprocess.run(["ffmpeg","-y","-i",str(input_mp4),"-vf",vf,"-c:v","libx264","-preset","medium","-crf","19","-c:a","aac","-b:a","192k",str(output_mp4)],capture_output=True,text=True)
    if p.returncode!=0: raise RuntimeError("FFmpeg ha fallito. "+(p.stderr or p.stdout)[-1800:])
    return output_mp4
