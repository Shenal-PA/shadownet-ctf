"""Validate the static OSINT challenge without changing public assets."""
import json
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1] / 'stages' / 'stage1-osint'
FLAG = 'SHADOWNET{nexacorp_first_contact}'

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.ids, self.links = path, set(), []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, (self.path, 'duplicate ID', attrs['id'])
            self.ids.add(attrs['id'])
        if tag == 'img':
            assert attrs.get('alt'), (self.path, 'missing image alt')
        for attr in ('href', 'src'):
            if attrs.get(attr):
                self.links.append(attrs[attr])

pages = {p.resolve(): Page(p) for p in ROOT.glob('*.html')}
for path, page in pages.items():
    assert FLAG not in path.read_text(), (path, 'flag leaked in HTML')
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        target = (path.parent / unquote(url.path)).resolve() if url.path else path
        assert target.is_file(), (path.name, 'missing resource', link)
        assert target.is_relative_to(ROOT.resolve()), (path, 'resource outside stage', link)
        if url.fragment:
            assert target in pages and unquote(url.fragment) in pages[target].ids, (path.name, 'missing anchor', link)

seen, pending = set(), [(ROOT / 'index.html').resolve()]
while pending:
    path = pending.pop()
    if path in seen:
        continue
    seen.add(path)
    for link in pages[path].links:
        url = urlsplit(link)
        target = (path.parent / unquote(url.path)).resolve()
        if not url.scheme and target in pages and target not in seen:
            pending.append(target)
# Legacy profile is an alias; all twelve canonical profiles must be reachable.
assert set(pages) - seen <= {(ROOT / 'employee-profile.html').resolve()}
directory = pages[(ROOT / 'staff-directory.html').resolve()]
profiles = {urlsplit(link).path for link in directory.links if link.endswith('.html')}
assert len(profiles - {'index.html', 'staff-directory.html', 'updates.html'}) == 12
profile_photos = {
    'jordan-lee': 'jordan-media-briefing.png',
    'maya-fernando': 'maya-security-workshop.png',
    'ravi-patel': 'ravi-data-workspace.png',
    'alex-chen': 'alex-research-bench.png',
    'ethan-cole': 'ethan-development-studio.png',
    'daniel-brooks': 'daniel-site-survey.png',
}
assert len(set(profile_photos.values())) == 6
for slug, photo in profile_photos.items():
    assert f'src="assets/{photo}"' in (ROOT / f'{slug}.html').read_text()
    assert f'href="assets/{photo}" download' in (ROOT / f'{slug}.html').read_text()

images = sorted((ROOT / 'assets').glob('*'))
metadata = json.loads(subprocess.check_output(['exiftool', '-j', '-Comment', *map(str, images)], text=True))
flag_images = [Path(item['SourceFile']).name for item in metadata if FLAG in item.get('Comment', '')]
assert flag_images == ['daniel-site-survey.png'], flag_images
for path in ROOT.glob('*'):
    if path.is_file() and path.suffix in ('.html', '.css', '.js', '.json'):
        assert 'SHADOWNET{' not in path.read_text(), ('public source flag', path)
print(f'PASS: {len(pages)} HTML pages; 12 reachable staff profiles; all local links and anchors valid; image alt text present; exactly one metadata flag, in Daniel’s photo.')
