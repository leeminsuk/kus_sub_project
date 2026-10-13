"""Restore public static game resources referenced by the bundled build.

Normal play does not run this script or contact the original website.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import json
import re
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://coastalworld.merci-michel.com'
REFERENCE = re.compile(r'/(?:assets|vendors|icons|share)/[^\s\"\x27<>`\\()?#]+')
EXTENSIONS = {'.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.webp', '.avif',
              '.svg', '.glb', '.bin', '.woff', '.woff2', '.wasm', '.m4a', '.mp3', '.ogg'}

def references(text):
    result = set()
    for ref in REFERENCE.findall(text):
        if Path(ref).suffix not in EXTENSIONS:
            continue
        # Bundled source-map keys describe source files, not public files.
        if ref.startswith('/assets/') and '/' in ref[len('/assets/'):]:
            continue
        result.add(ref)
    return result

def fetch(ref):
    target = (ROOT / ref.lstrip('/')).resolve()
    if not target.is_relative_to(ROOT):
        raise ValueError('Resource outside project')
    if target.is_file():
        return ref, 'existing', target.stat().st_size
    for attempt in range(3):
        try:
            request = urllib.request.Request(SOURCE + ref, headers={'User-Agent': 'CoastalWorld-Local-Asset-Restore/1.0'})
            with urllib.request.urlopen(request, timeout=25) as response:
                data = response.read()
                if 'text/html' in response.headers.get('Content-Type', ''):
                    raise ValueError('Expected asset, received HTML')
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            return ref, 'downloaded', len(data)
        except urllib.error.HTTPError as error:
            if error.code == 404 or attempt == 2:
                return ref, f'HTTP {error.code}', 0
        except Exception as error:
            if attempt == 2:
                return ref, str(error), 0

def main():
    pending = {'/assets/' + kind + '_en.json' for kind in ['fintechs', 'characters', 'dialogs', 'items', 'quests']}
    pending.update({'/vendors/draco/draco_wasm_wrapper.js', '/vendors/draco/draco_decoder.wasm',
                    '/vendors/draco/draco_decoder.js', '/icons/favicon_dark.svg', '/icons/favicon_light.svg',
                    '/icons/icon_180.png', '/favicon.ico', '/manifest.webmanifest'})
    visited = set()
    failures = []
    downloaded = 0
    byte_count = 0
    for round_number in range(4):
        for file in [ROOT / 'index.html', *ROOT.glob('*.webmanifest'), *ROOT.glob('assets/*.js'), *ROOT.glob('assets/*.css'), *ROOT.glob('assets/*.json')]:
            pending.update(references(file.read_text(encoding='utf-8')))
        batch = sorted(pending - visited)
        if not batch:
            break
        print(f'Round {round_number + 1}: checking {len(batch)} resources', flush=True)
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(fetch, ref): ref for ref in batch}
            for count, future in enumerate(as_completed(futures), 1):
                ref, status, size = future.result()
                visited.add(ref)
                if status == 'downloaded':
                    downloaded += 1
                    byte_count += size
                elif status != 'existing':
                    failures.append({'path': ref, 'error': status})
                if count % 100 == 0:
                    print(f'  {count}/{len(batch)} checked; {downloaded} downloaded', flush=True)
    print(json.dumps({'downloaded': downloaded, 'bytes': byte_count, 'failures': failures}, indent=2))
    if failures:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
