from pathlib import Path

p=Path('seller-radar-unico.html')
s=p.read_text(encoding='utf-8')
old="const data=merged.operational;const goRows=data.filter"
new="const data=merged.operational;data.forEach(r=>{if(/RADAR_EDILIZIO/.test(String(r.SELLER_SIGNAL||'')))r.EDILIZIO=true;});const goRows=data.filter"
if old not in s:
    if new not in s:
        raise SystemExit('Hook data non trovato')
else:
    s=s.replace(old,new,1)
old2="edilizio.textContent=eRows.length;"
new2="edilizio.textContent=data.filter(r=>/RADAR_EDILIZIO/.test(String(r.SELLER_SIGNAL||''))).length;"
if old2 not in s:
    if new2 not in s:
        raise SystemExit('Contatore edilizio non trovato')
else:
    s=s.replace(old2,new2,1)
p.write_text(s,encoding='utf-8')
print('SELLER RADAR EDILIZIO UI PATCH PASS')
