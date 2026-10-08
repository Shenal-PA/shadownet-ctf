# ShadowNet CTF — Setup and Integration

All code and answer-free assets are included in Git. No private bundle needs to
be transferred between teammates. Install Python 3, ExifTool, and Docker Compose.
On Ubuntu/Debian, the ExifTool package is `libimage-exiftool-perl`.

From the repository root:

```sh
python3 tools/setup_challenges.py
```

This creates fresh random flags on first setup, prepares Stage 1's playable
website, and creates Stage 4's `.env`. Re-running preserves existing flags.
The setup tool contains no real flags, passwords, or signing keys.

Run Stage 1 in one terminal:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory .private/stage1/site
```

Open http://localhost:8000. `stages/stage1-osint/` is the committed answer-free
template; serve the generated site for the playable metadata challenge.

Run Stage 4:

```sh
docker compose -f stages/stage4-web/docker-compose.yml up --build -d
```

Open http://localhost:8084. The intentionally vulnerable portal uses synthetic
lab accounts and its flag comes from the ignored `.env` file.

## Dashboard integration

Run setup **on the machine that prepares the deployed challenges**. Import
`.private/verification.json` into the dashboard's server-only verification store.
It contains stage IDs and SHA-256 hashes, not plaintext flags. Hash the exact
submitted UTF-8 flag string and compare with the stored hash. Never send this
manifest to the browser or publish it as a download.

Publish `.private/stage1/site/` as the Stage 1 player assets, and configure the
Stage 4 connection URL for the deployed container. The dashboard server must
use the hashes from that same deployment: each independent setup generates
different flags. An all-in-one deployment can run the setup command during its
build/provisioning step, so no manual private-file handoff is needed.

Keep `.private/` and Stage 4 `.env` outside Git and preserve them in private
hosting storage/backups. Do not regenerate them on every dashboard build;
replacing deployment flags requires updating its verification records too.
Existing private authoring scripts and organizer notes are optional local tools,
not requirements for a fresh clone. The public `tools/setup_challenges.py` is the
portable setup entry point.

## Local verification

Run the Stage 4 tests:

```sh
cd stages/stage4-web
python3 -m unittest -v test_app.py
```

Existing Stage 1 authoring/check scripts are local organizer tools and are not
required by the public setup workflow. Preserve any private configuration before
changing flags or redeploying a running challenge.
