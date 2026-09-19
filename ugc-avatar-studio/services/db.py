from __future__ import annotations
import sqlite3
from .config import ROOT
DB = ROOT / "projects" / "ugc_avatar_studio.db"
def init_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB) as con:
        con.execute("""CREATE TABLE IF NOT EXISTS renders(
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            script TEXT NOT NULL,
            avatar_file TEXT NOT NULL,
            output_file TEXT,
            status TEXT NOT NULL,
            error TEXT
        )""")
        con.commit()
def save_render(row):
    with sqlite3.connect(DB) as con:
        con.execute("INSERT OR REPLACE INTO renders(id,created_at,script,avatar_file,output_file,status,error) VALUES(?,?,?,?,?,?,?)", row)
        con.commit()
