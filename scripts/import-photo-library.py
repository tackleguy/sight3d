#!/usr/bin/env python3
"""Import real GLDv2 photo URLs + credits, not image bytes or invented entries."""
import argparse, collections, csv, datetime, hashlib, io, json, os, pathlib, re, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'https://s3.amazonaws.com/google-landmark/metadata/'
SOURCE = 'https://github.com/cvdfoundation/google-landmark'

def rows(name):
    request = urllib.request.Request(BASE + name, headers={'User-Agent': 'Sight3D-photo-index/1.0 (https://github.com/tackleguy/sight3d)'})
    response = urllib.request.urlopen(request, timeout=60)
    return csv.DictReader(io.TextIOWrapper(response, encoding='utf-8-sig', newline=''))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=400000)
    parser.add_argument('--output', type=pathlib.Path, default=ROOT/'data/photos')
    args = parser.parse_args()
    if args.count < 1: raise ValueError('count must be positive')
    labels = {}
    for r in rows('train_label_to_hierarchical.csv'):
        # Buildings and constructed structures; exclude natural landmarks and unclassified rows.
        if r['natural_or_human_made'] != 'human-made': continue
        tags = r['supercategory'] + ' ' + r['hierarchical_label']
        if not re.search(r'building|church|cathedral|temple|mosque|shrine|monastery|castle|palace|fort|tower|stadium|arena|sports venue|bridge|museum|house|hall|station|library|theat|hotel|university|school|hospital|skyscraper|office|residential|apartment|lighthouse|airport|synagogue|pagoda|chapel|basilica|abbey|convent', tags, re.I): continue
        name = urllib.parse.unquote(r['category'].split('Category:', 1)[-1]).replace('_', ' ')
        labels[r['landmark_id']] = {'id': r['landmark_id'], 'name': name, 'category': r['category'].replace('http:', 'https:'), 'tags': tags.strip(), 'photos': []}
    print(f'{len(labels):,} eligible architecture labels', flush=True)
    seen = set()
    ids = set()
    scanned = 0
    for row, credit in zip(rows('train.csv'), rows('train_attribution.csv')):
        scanned += 1
        if row['id'] != credit['id']: raise ValueError('Source row order changed; refusing a mismatched attribution join')
        label = labels.get(row['landmark_id'])
        if not label or len(label['photos']) >= 128: continue
        url = row['url'].replace('http:', 'https:')
        parsed = urllib.parse.urlparse(url)
        if parsed.hostname != 'upload.wikimedia.org' or not parsed.path.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')): continue
        if url in seen or row['id'] in ids: continue
        # Preserve the supplied per-image license/credit. Keep only entries with a CC license URL.
        if not re.search(r'creativecommons.org/licenses/by(?:-sa)?/[\d.]+', credit['license']): continue
        if not credit['author'] or not credit['url'].startswith(('http://commons.wikimedia.org/', 'https://commons.wikimedia.org/')): continue
        seen.add(url); ids.add(row['id'])
        label['photos'].append([row['id'], url, credit['url'].replace('http:', 'https:'), credit['author'], credit['license'], credit['title']])
        if len(ids) % 25000 == 0: print(f'{len(ids):,} photos / {scanned:,} source rows', flush=True)
        if len(ids) >= args.count: break
    if len(ids) < args.count: raise ValueError(f'Only {len(ids)} eligible distinct records; target {args.count} not met')
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    shards = collections.defaultdict(dict)
    catalog = []
    for key, label in labels.items():
        if not label['photos']: continue
        shard = f'{int(key)%256:02x}'
        photos = label.pop('photos')
        shards[shard][key] = photos
        catalog.append({**label, 'count': len(photos), 'shard': shard})
    def write(name, value):
        target = output/name
        tmp = target.with_suffix('.tmp')
        tmp.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'))+'\n')
        os.replace(tmp, target)
    files = {}
    for shard, value in shards.items():
        name = f'photos-{shard}.json'
        write(name, value)
        files[name] = hashlib.sha256((output/name).read_bytes()).hexdigest()
    write('landmarks.json', catalog)
    manifest = {'version': 1, 'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'photoCount': len(ids), 'landmarkCount': len(catalog), 'sourceRowsScanned': scanned, 'source': SOURCE, 'metadataLicense': 'CC BY 4.0 — Google', 'photoLicenses': 'Per-photo source license and author are retained; verify current terms on each Commons file page.', 'mode': 'URL index; images load on demand, not downloaded or visually audited', 'selection': 'Human-made architectural labels, maximum 128 photos per landmark, distinct source IDs and original URLs; no content-hash deduplication.', 'files': files}
    write('manifest.json', manifest)
    print(json.dumps({k:v for k,v in manifest.items() if k!='files'}, indent=2), flush=True)

if __name__ == '__main__': main()
