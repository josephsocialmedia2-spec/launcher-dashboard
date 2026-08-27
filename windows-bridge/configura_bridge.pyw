# -*- coding: utf-8 -*-
from __future__ import annotations
import json,time,urllib.request,webbrowser
from pathlib import Path
import tkinter as tk
from tkinter import messagebox

BASE=Path.home()/"Documents"/"F1_Bridge";CONFIG=BASE/"config.json"
BASE.mkdir(parents=True,exist_ok=True)

def load():
    try:return json.loads(CONFIG.read_text(encoding="utf-8"))
    except Exception:return {}

def http_json(url,method="GET",data=None,headers=None,timeout=20):
    body=None if data is None else json.dumps(data).encode("utf-8")
    req=urllib.request.Request(url,data=body,method=method,headers=headers or {})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        t=r.read().decode("utf-8");return json.loads(t) if t else None

def save_and_login():
    url=e_url.get().strip().rstrip('/');key=e_key.get('1.0','end').strip();email=e_email.get().strip();password=e_pwd.get();ollama=e_ollama.get().strip().rstrip('/') or 'http://127.0.0.1:11434';model=e_model.get().strip()
    if not url.startswith('https://') or '.supabase.co' not in url or len(key)<20:
        messagebox.showerror('F1 Bridge','Controlla Project URL e anon public key.');return
    if not email or not password:
        messagebox.showerror('F1 Bridge','Inserisci email e password del tuo utente Supabase Auth.');return
    try:
        j=http_json(url+'/auth/v1/token?grant_type=password','POST',{'email':email,'password':password},{'apikey':key,'Content-Type':'application/json'})
        c={'supabase_url':url,'anon_key':key,'contacts_table':'contacts','visits_table':'field_visits','access_token':j['access_token'],'refresh_token':j['refresh_token'],'expires_at':time.time()+float(j.get('expires_in',3600)),'user_email':(j.get('user') or {}).get('email',email),'ollama_url':ollama,'ollama_model':model}
        CONFIG.write_text(json.dumps(c,ensure_ascii=False,indent=2),encoding='utf-8')
        e_pwd.delete(0,'end');status.set('SYNC CONFIGURATO — '+c['user_email'])
        messagebox.showinfo('F1 Bridge','Configurazione salvata. La password non è stata memorizzata.\nIl bridge userà il refresh token per le sincronizzazioni successive.')
    except Exception as ex:messagebox.showerror('F1 Bridge','Accesso non riuscito:\n'+str(ex))

def test_ollama():
    try:
        j=http_json((e_ollama.get().strip().rstrip('/') or 'http://127.0.0.1:11434')+'/api/tags');names=[x.get('name','') for x in j.get('models',[])]
        messagebox.showinfo('Ollama','Modelli trovati:\n'+('\n'.join(names[:12]) if names else 'Nessun modello'))
    except Exception as ex:messagebox.showerror('Ollama','Ollama non raggiungibile:\n'+str(ex))

def open_app():webbrowser.open('https://josephsocialmedia2-spec.github.io/launcher-dashboard/setup-cloud.html')

c=load();root=tk.Tk();root.title('F1 — Configura Sync PC / Telefono / Ollama');root.geometry('720x690');root.configure(bg='#070907')
def label(t):tk.Label(root,text=t,bg='#070907',fg='#ffffff',font=('Segoe UI',10,'bold')).pack(anchor='w',padx=22,pady=(10,2))
def entry(val='',show=None):
    x=tk.Entry(root,bg='#101510',fg='white',insertbackground='white',relief='flat',font=('Segoe UI',11),show=show);x.insert(0,val);x.pack(fill='x',padx=22,ipady=9);return x

tk.Label(root,text='F1 BRIDGE',bg='#070907',fg='#39f28a',font=('Segoe UI',11,'bold')).pack(anchor='w',padx=22,pady=(20,0));tk.Label(root,text='Telefono ↔ PC ↔ Ollama',bg='#070907',fg='white',font=('Segoe UI',22,'bold')).pack(anchor='w',padx=22)
label('Supabase Project URL');e_url=entry(c.get('supabase_url',''))
label('Supabase anon public key');e_key=tk.Text(root,height=4,bg='#101510',fg='white',insertbackground='white',relief='flat',font=('Consolas',9));e_key.insert('1.0',c.get('anon_key',''));e_key.pack(fill='x',padx=22)
label('Email utente Supabase Auth');e_email=entry(c.get('user_email',''))
label('Password — usata solo per effettuare il login, NON salvata');e_pwd=entry('',show='*')
label('Ollama URL');e_ollama=entry(c.get('ollama_url','http://127.0.0.1:11434'))
label('Modello Ollama (vuoto = primo modello disponibile)');e_model=entry(c.get('ollama_model',''))
frame=tk.Frame(root,bg='#070907');frame.pack(fill='x',padx=22,pady=18)
tk.Button(frame,text='SALVA E ACCEDI',command=save_and_login,bg='#39f28a',fg='#07100a',relief='flat',font=('Segoe UI',10,'bold'),padx=15,pady=10).pack(side='left',padx=(0,8));tk.Button(frame,text='TEST OLLAMA',command=test_ollama,bg='#1c261f',fg='white',relief='flat',font=('Segoe UI',10,'bold'),padx=15,pady=10).pack(side='left',padx=8);tk.Button(frame,text='APRI SETUP APP',command=open_app,bg='#1c261f',fg='white',relief='flat',font=('Segoe UI',10,'bold'),padx=15,pady=10).pack(side='left',padx=8)
status=tk.StringVar(value=('Configurato: '+c.get('user_email','') if c.get('refresh_token') else 'Sync PC non ancora autenticato'));tk.Label(root,textvariable=status,bg='#070907',fg='#39f28a',font=('Segoe UI',10,'bold')).pack(anchor='w',padx=22)
tk.Label(root,text='Per telefono e PC usa lo stesso utente Supabase. Prima esegui supabase-schema.sql aggiornato nel progetto. Il bridge non deduce mai chi è proprietario e non abilita automaticamente le chiamate: RPO resta un controllo separato.',wraplength=670,justify='left',bg='#070907',fg='#aeb7b0',font=('Segoe UI',9)).pack(anchor='w',padx=22,pady=15)
root.mainloop()
