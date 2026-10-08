"""Prepare Stages 1 and 4 after cloning; no committed flags or private files required."""
import hashlib
import json
import re
import secrets
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'stages/stage1-osint'
PRIVATE = ROOT / '.private/stage1'
if shutil.which('exiftool') is None:
    raise SystemExit('Install ExifTool first (Ubuntu/Debian: sudo apt install libimage-exiftool-perl).')
PRIVATE.mkdir(parents=True, exist_ok=True)
config_path = PRIVATE / 'config.json'
if not config_path.exists():
    profiles = {
        'jordan-lee': 'jordan-media-briefing.png',
        'maya-fernando': 'maya-security-workshop.png',
        'ravi-patel': 'ravi-data-workspace.png',
        'alex-chen': 'alex-research-bench.png',
        'ethan-cole': 'ethan-development-studio.png',
        'daniel-brooks': 'daniel-site-survey.png',
    }
    employee = secrets.choice(list(profiles))
    config_path.write_text(json.dumps({
        'flag': 'SHADOWNET{archive_' + secrets.token_hex(16) + '}',
        'employee': employee,
        'image': profiles[employee],
    }, indent=2) + '\n')
config = json.loads(config_path.read_text())
flag, employee, filename = config['flag'], config['employee'], config['image']
if not re.fullmatch(r'SHADOWNET\{[a-z0-9_]+\}', flag):
    raise SystemExit('Invalid private flag format.')
if not re.fullmatch(r'[a-z-]+', employee) or Path(filename).name != filename:
    raise SystemExit('Invalid private asset configuration.')
site = PRIVATE / 'site'
shutil.copytree(SOURCE, site, dirs_exist_ok=True)
profile = site / (employee + '.html')
photo = site / 'assets' / filename
if not profile.is_file() or not photo.is_file():
    raise SystemExit('Configured private profile/photo is missing.')
html = profile.read_text()
name = re.search(r'<h1>([^<]+)</h1>', html).group(1)
html, changed = re.subn(
    r'(<h2>From [^<]+</h2><p>).*?(</p>)',
    lambda m: m.group(1) + 'I saved the original photograph from our September review. The archive keeps its publishing notes with the file; the preview only tells part of the story.' + m.group(2),
    html, count=1,
)
if changed != 1 or f'assets/{filename}' not in html:
    raise SystemExit('The configured profile must contain its original image download.')
profile.write_text(html)
news = site / 'updates.html'
text = news.read_text()
text, changed = re.subn(
    r'(<article[^>]+id="research">).*?(</article>)',
    lambda m: m.group(1) + f'<div class="card-body"><p class="eyebrow">18 September 2026 / People &amp; projects</p><h2>Notes from the September review.</h2><p>{name} shared an original workplace photograph in the public archive. The original file preserves details that are easy to miss in a preview.</p><a class="text-link" href="{employee}.html">Read {name}’s update →</a></div>' + m.group(2),
    text, count=1,
)
if changed != 1:
    raise SystemExit('Newsroom archive slot is missing.')
news.write_text(text)
result = subprocess.run(['exiftool', '-overwrite_original', '-Comment=' + flag, str(photo)], capture_output=True)
if result.returncode:
    raise SystemExit('Could not write private image metadata.')
(PRIVATE / 'flag.sha256').write_text(hashlib.sha256(flag.encode()).hexdigest() + '\n')
(PRIVATE / 'organizer.md').write_text(
    '# Private Stage 1 solution\n\n'
    f'Employee: {name}\n\nProfile: {employee}.html\n\n'
    f'Image: assets/{filename}\n\nFlag: `{flag}`\n\n'
    'Follow the newsroom archive clue to the employee profile, download the original image, '
    'and inspect the Comment with ExifTool.\n\n'
    'Use flag.sha256 for exact server-side verification. The earlier committed flag is retired.\n'
)
env_path = ROOT / 'stages/stage4-web/.env'
placeholder = 'SHADOWNET{replace_with_your_private_flag}'
if env_path.exists():
    env_text = env_path.read_text()
    entries = [line.partition('=')[2].strip() for line in env_text.splitlines() if line.startswith('FLAG=')]
    if len(entries) != 1:
        raise SystemExit('Existing Stage 4 .env must contain exactly one FLAG entry; it was not overwritten.')
    stage4_flag = entries[0]
    if stage4_flag == placeholder:
        stage4_flag = 'SHADOWNET{front_door_' + secrets.token_hex(16) + '}'
        env_path.write_text(env_text.replace('FLAG=' + placeholder, 'FLAG=' + stage4_flag))
else:
    stage4_flag = 'SHADOWNET{front_door_' + secrets.token_hex(16) + '}'
    env_path.write_text('FLAG=' + stage4_flag + '\n')
if not re.fullmatch(r'SHADOWNET\{[a-z0-9_]+\}', stage4_flag):
    raise SystemExit('Stage 4 FLAG must use the project format, without shell quotes.')
verification = {
    'algorithm': 'sha256',
    'encoding': 'utf-8',
    'normalization': 'none; exact submitted flag string',
    'challenges': [
        {'stage': 1, 'flag_sha256': hashlib.sha256(flag.encode()).hexdigest()},
        {'stage': 4, 'flag_sha256': hashlib.sha256(stage4_flag.encode()).hexdigest()},
    ],
}
(ROOT / '.private/verification.json').write_text(json.dumps(verification, indent=2) + '\n')
print('Ready: Stage 1 player site in .private/stage1/site; Stage 4 .env configured.')
print('Dashboard: import .private/verification.json on the server; never serve it to players.')
print('Existing flags are preserved. All generated answers and verifier data stay outside Git.')
