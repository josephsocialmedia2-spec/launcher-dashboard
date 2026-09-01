#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / 'data' / 'radar_edilizio.json'
SEED_PATH = ROOT / 'data' / 'radar_history_seed.json'


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    db = load(DB_PATH)
    seed = load(SEED_PATH)
    backlog = db.setdefault('backlog', [])
    existing = {(x.get('comune'), x.get('atto')) for x in backlog}
    added = 0
    for row in seed.get('records', []):
        key = (row.get('comune'), row.get('atto'))
        if key not in existing:
            backlog.append(row)
            existing.add(key)
            added += 1
    backlog.sort(key=lambda x: (x.get('date', ''), x.get('comune', ''), x.get('atto', '')), reverse=True)
    db.setdefault('meta', {})['history_seed_verified_at'] = seed.get('verified_at')
    save(DB_PATH, db)
    print(f'HISTORY SEED added={added} total_backlog={len(backlog)}')


if __name__ == '__main__':
    main()
