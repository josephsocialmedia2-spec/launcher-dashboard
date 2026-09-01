#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / 'data' / 'radar_edilizio.json'
SEED_PATH = ROOT / 'data' / 'radar_history_seed.json'


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def hist_id(comune, atto):
    digest = hashlib.sha1(f'{comune}|{atto}'.encode('utf-8')).hexdigest()[:10].upper()
    return f'HIST-{digest}'


def priority_for(classe):
    text = (classe or '').lower()
    if 'permesso di costruire' in text and 'sanatoria' not in text:
        return 'MEDIA'
    if any(k in text for k in ('scia alternativa', 'elenco scia', 'elenco cila')):
        return 'MEDIA'
    return 'BASSA'


def main():
    db = load(DB_PATH)
    seed = load(SEED_PATH)
    backlog = db.setdefault('backlog', [])
    existing_backlog = {(x.get('comune'), x.get('atto')) for x in backlog}
    added_backlog = 0

    for row in seed.get('records', []):
        key = (row.get('comune'), row.get('atto'))
        if key not in existing_backlog:
            backlog.append(row)
            existing_backlog.add(key)
            added_backlog += 1

    backlog.sort(key=lambda x: (x.get('date', ''), x.get('comune', ''), x.get('atto', '')), reverse=True)

    opportunities = db.setdefault('opportunities', [])
    existing_opp = {(x.get('comune'), x.get('atto')) for x in opportunities}
    added_signals = 0

    for row in backlog:
        key = (row.get('comune'), row.get('atto'))
        if key in existing_opp:
            continue
        comune = row.get('comune', '')
        atto = row.get('atto', '')
        classe = row.get('classe', 'Atto edilizio')
        source_page = row.get('source_url', '')
        opportunities.append({
            'id': hist_id(comune, atto),
            'comune': comune,
            'date': row.get('date', ''),
            'atto': atto,
            'tipo': classe,
            'indirizzo': 'DA APPROFONDIRE',
            'catasto': '',
            'descrizione': f'{atto} · {classe}. Segnale storico/pubblico da aprire, qualificare e collegare a tecnico, impresa e cantiere.',
            'societa': '',
            'professionista': '',
            'priorita': priority_for(classe),
            'stato': 'DA APPROFONDIRE',
            'azione': 'APRIRE ATTO / VERIFICARE INDIRIZZO / CERCARE TECNICO E IMPRESA / INSERIRE CONTATTO PROFESSIONALE',
            'source_url': '',
            'source_page': source_page,
            'verified': False,
            'origin': 'BACKLOG_STORICO'
        })
        existing_opp.add(key)
        added_signals += 1

    opportunities.sort(key=lambda x: (x.get('date', ''), x.get('comune', ''), x.get('atto', '')), reverse=True)
    db.setdefault('meta', {})['history_seed_verified_at'] = seed.get('verified_at')
    db['meta']['backlog_promoted_to_seller_radar'] = True
    save(DB_PATH, db)
    print(f'HISTORY SEED backlog_added={added_backlog} backlog_total={len(backlog)} seller_signals_added={added_signals} opportunities_total={len(opportunities)}')


if __name__ == '__main__':
    main()
