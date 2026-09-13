#!/usr/bin/env python3
import hashlib
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'approval-queue.json'
LOCAL_FEED = ROOT / 'data' / 'acquisition-public.json'
REMOTE_BASE = 'https://raw.githubusercontent.com/josephsocialmedia2-spec/open-social-scheduler/main/'


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def load_json(path, default):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except Exception:
        return default


def fetch_json(relative, default):
    url = REMOTE_BASE + relative
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'F1-Approval-Queue/1.0'})
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception as e:
        print(f'WARN {relative}: {e}')
        return default


def stable_id(prefix, value):
    raw = str(value or '').strip()
    if raw:
        cleaned = ''.join(c if c.isalnum() or c in '-_' else '-' for c in raw)[:110]
        if cleaned:
            return f'{prefix}-{cleaned}'
    return f'{prefix}-{hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]}'


def add(out, seen, item):
    aid = str(item.get('approval_id') or '').strip()
    if not aid or aid in seen:
        return
    seen.add(aid)
    item.setdefault('status', 'DA_APPROVARE')
    item.setdefault('created_at', now_iso())
    item.setdefault('score', None)
    out.append(item)


def from_acquisition(out, seen):
    feed = load_json(LOCAL_FEED, {})
    for t in feed.get('tasks', []) or []:
        status = str(t.get('status') or 'OPEN').upper()
        if status in {'DONE', 'CANCELLED'}:
            continue
        task_id = str(t.get('task_id') or t.get('id') or '').strip()
        meta = t.get('metadata') if isinstance(t.get('metadata'), dict) else {}
        source_url = t.get('source_url') or meta.get('source_url') or ''
        comune = t.get('comune') or meta.get('comune') or ''
        via = t.get('via') or meta.get('via') or ''
        reason = t.get('reason') or meta.get('reason') or 'Risultato Seller Radar da verificare'
        subject = t.get('immobile') or meta.get('immobile') or ' '.join(x for x in [via, comune] if x).strip() or reason
        add(out, seen, {
            'approval_id': task_id or stable_id('seller', source_url + reason),
            'task_id': task_id,
            'lead_id': t.get('lead_id') or '',
            'property_id': t.get('property_id') or '',
            'module': 'SELLER_RADAR',
            'platform': t.get('source') or meta.get('source') or 'IMMOBILIARE',
            'comune': comune,
            'type': t.get('task_type') or 'VERIFY',
            'subject': subject,
            'result': reason,
            'action_proposed': t.get('task_type') or 'VERIFICA',
            'score': t.get('priority'),
            'source_url': source_url,
            'preview_url': '',
            'created_at': t.get('created_at') or feed.get('generated_at') or now_iso(),
            'origin': 'data/acquisition-public.json',
        })


def from_social_preview(out, seen):
    manifest = fetch_json('publisher/social-preview-latest.json', {})
    for e in manifest.get('entries', []) or []:
        raw_status = str(e.get('status') or '').lower()
        if raw_status and raw_status not in {'awaiting_approval', 'ready', 'pending', 'draft'}:
            continue
        eid = str(e.get('id') or '')
        add(out, seen, {
            'approval_id': stable_id('social-content', eid),
            'task_id': stable_id('social-content', eid),
            'lead_id': '',
            'property_id': '',
            'module': 'SOCIAL_CONTENT',
            'platform': 'FACEBOOK · INSTAGRAM · LINKEDIN',
            'comune': e.get('territory') or '',
            'type': 'CONTENT_APPROVAL',
            'subject': e.get('title') or e.get('asset_name') or 'Contenuto social',
            'result': e.get('caption') or e.get('cta') or 'Contenuto generato automaticamente',
            'action_proposed': 'APPROVA PUBBLICAZIONE',
            'score': None,
            'source_url': e.get('asset_url') or '',
            'preview_url': e.get('asset_url') or '',
            'created_at': e.get('scheduled_at') or manifest.get('updated_at') or now_iso(),
            'origin': 'open-social-scheduler/publisher/social-preview-latest.json',
            'metadata': {
                'service_id': e.get('service_id') or '',
                'content_date': e.get('content_date') or '',
                'cta': e.get('cta') or '',
                'publication_ready': bool(e.get('publication_ready')),
            },
        })


def from_groups(out, seen):
    data = fetch_json('growth/groups.json', {})
    for g in data.get('groups', []) or []:
        status = str(g.get('status') or '').upper()
        if status != 'PENDING_APPROVAL':
            continue
        gid = str(g.get('id') or '')
        add(out, seen, {
            'approval_id': stable_id('facebook-group', gid),
            'task_id': stable_id('facebook-group', gid),
            'lead_id': '',
            'property_id': '',
            'module': 'FACEBOOK_GROUPS',
            'platform': 'FACEBOOK',
            'comune': g.get('territory') or '',
            'type': 'GROUP_APPROVAL',
            'subject': g.get('name') or 'Gruppo Facebook',
            'result': g.get('snippet') or 'Nuovo gruppo territoriale rilevato',
            'action_proposed': 'APPROVA GRUPPO',
            'score': None,
            'source_url': g.get('url') or '',
            'preview_url': '',
            'created_at': g.get('discovered_at') or now_iso(),
            'origin': 'open-social-scheduler/growth/groups.json',
        })


def from_signals(out, seen):
    data = fetch_json('growth/signals.json', {})
    for s in data.get('signals', []) or []:
        sid = s.get('id') or s.get('source_url') or (str(s.get('title') or '') + str(s.get('snippet') or ''))
        add(out, seen, {
            'approval_id': stable_id('facebook-signal', sid),
            'task_id': stable_id('facebook-signal', sid),
            'lead_id': '',
            'property_id': '',
            'module': 'FACEBOOK_NETWORK',
            'platform': 'FACEBOOK',
            'comune': s.get('territory') or '',
            'type': 'NETWORK_SIGNAL',
            'subject': s.get('title') or s.get('name') or 'Segnale Facebook',
            'result': s.get('snippet') or 'Segnale immobiliare rilevato automaticamente',
            'action_proposed': 'APPROVA ANALISI',
            'score': s.get('score'),
            'source_url': s.get('source_url') or s.get('url') or s.get('group_url') or '',
            'preview_url': '',
            'created_at': s.get('discovered_at') or s.get('created_at') or now_iso(),
            'origin': 'open-social-scheduler/growth/signals.json',
        })


def main():
    items, seen = [], set()
    from_acquisition(items, seen)
    from_social_preview(items, seen)
    from_groups(items, seen)
    from_signals(items, seen)
    items.sort(key=lambda x: (str(x.get('created_at') or ''), str(x.get('approval_id') or '')), reverse=True)
    payload = {
        'version': 1,
        'generated_at': now_iso(),
        'pipeline': 'F1_COMMON_APPROVAL_QUEUE',
        'crm_target': 'F1 Acquisition CRM / Supabase tasks',
        'items': items,
        'summary': {
            'total': len(items),
            'seller_radar': sum(1 for x in items if x['module'] == 'SELLER_RADAR'),
            'social_content': sum(1 for x in items if x['module'] == 'SOCIAL_CONTENT'),
            'facebook_groups': sum(1 for x in items if x['module'] == 'FACEBOOK_GROUPS'),
            'facebook_network': sum(1 for x in items if x['module'] == 'FACEBOOK_NETWORK'),
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(payload['summary'], ensure_ascii=False))


if __name__ == '__main__':
    main()
