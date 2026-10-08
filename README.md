# ShadowNet CTF

An eight-stage Capture The Flag project for **IE3132 — Penetration Testing, SLIIT**.

**Status: early implementation.** Stage 1 is a complete standalone static OSINT challenge with a company website, twelve staff profiles, and a metadata puzzle. Stage 4 is implemented and tested locally. Stage 2 assets and a Stage 3 oracle are present; the dashboard is partial and the full platform is not yet runnable or deployed.

## Set up Stages 1 and 4 after cloning

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

### Dashboard integration

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

## Concept

Players join a fictional underground hacker collective investigating and infiltrating **NexaCorp**, a corrupt fictional corporation. Each challenge introduces a different security skill, progressing from reconnaissance to an internal-network capstone.

The planned dashboard uses a **black, green, and red** visual theme, with challenge pages, progress tracking, flag submission, hints, and a leaderboard.

- **Audience:** intermediate cybersecurity students.
- **Flag format:** `SHADOWNET{...}`.
- **Delivery:** 2 static web stages, 3 Docker stages, and 3 VM-based stages.
- **VM count:** 4 actual machines, because Stage 8 uses both an Entry VM and a DB VM.

## Documentation

| Document | Purpose |
|---|---|
| [README.md](README.md) | Project overview, stage list, architecture, current status and contributor entry point |
| [update.md](update.md) | Detailed implementation plan, migration decisions, folder changes, responsibilities and checklist |

The eight-stage plan below supersedes the original six-stage overview. The eight stage folders are aligned. Implementation and integration are still incomplete; documentation alone does not implement the platform.

## Challenge stages

| # | Title | Domain / intended challenge | Difficulty | Delivery |
|---|---|---|---|---|
| 1 | First Contact | OSINT — mock company and employee clues, image metadata | Easy | Static web files |
| 2 | Frequency | Image + audio steganography — image clue, audio spectrogram, encoded flag | Easy–Moderate | Static web files |
| 3 | Broken Cipher | Cryptography — live Vigenère encryption oracle | Moderate | Docker |
| 4 | Front Door | Web security — deliberately vulnerable SQL login portal | Moderate | Docker |
| 5 | Automate It | Programming/scripting — predict tokens from an LCG service | Moderate | Docker |
| 6 | Decompiled | Reverse engineering — analyse a challenge ELF binary | Moderate–Hard | Ubuntu VM |
| 7 | Under the Hood | Linux security — exploit an intended privilege misconfiguration | Moderate–Hard | Ubuntu VM |
| 8 | Full Breach | Networking capstone — Entry Host SSRF/pivot path to an internal DB Host | Hard | Two Ubuntu VMs |

Difficulty and intended solve paths must be validated through testing.

**Stage 2 uses both an image and audio.** Current assets include a WAV file; MP3 was requested in the design. Confirm the final format after testing that the distributed audio preserves the readable spectrogram.

## Planned architecture

| Component | Responsibility | Planned location |
|---|---|---|
| Next.js dashboard | React UI, authentication, challenge pages, flag validation, progress and leaderboard | Vercel |
| Supabase PostgreSQL | Platform profiles, challenge metadata, protected verification data, submissions and scores | Supabase |
| Stage 1–2 assets | Mock pages and downloadable puzzle files | Dashboard static assets |
| Stage 3–5 services | Live crypto, web and scripting challenges | Separate Docker host |
| Stage 6–8 lab | RE VM, Linux VM, Entry VM and DB VM | Isolated Ubuntu VM infrastructure |

The migration replaces the **Flask dashboard** with **Next.js + React**. Python challenge services remain part of the plan; the Stage 4 Flask challenge is separate from the dashboard.

The **Stage 8 DB VM is a challenge target**, separate from the platform's Supabase database. The capstone must preserve the intended internal-only access path.

The planned player journey is:

1. Log in and select a challenge.
2. Download its files or follow its lab connection instructions.
3. Solve the challenge using appropriate tools.
4. Submit the flag to the dashboard.
5. Receive points once for a correct solve and see updated progress/rank.

Docker and VM challenges require separately provisioned infrastructure and tested remote access. Stage 3 and Stage 5 use TCP services, while VM access depends on the lab design. Dashboard hosting does not itself provide that connectivity.

## Technology plan

| Area | Planned technology |
|---|---|
| Dashboard | Next.js, React, TypeScript |
| Platform backend | Next.js API routes |
| Platform database | Supabase PostgreSQL |
| Dashboard deployment | Vercel |
| Challenge containers | Docker and Docker Compose |
| Challenge services | Python sockets, Flask and SQLite where appropriate |
| VM labs | Ubuntu 22.04 LTS as the current design baseline |
| Analysis tools | ExifTool, steganography tools, Audacity, Ghidra and Linux/network tools |

Final versions, authentication design, hosting limits, lab access and infrastructure costs must be confirmed during implementation.

## Repository layout

Current repository areas:

| Path | Current contents |
|---|---|
| `stages/` | Eight aligned stage folders; Stage 1 template, Stage 2 assets, Stage 3 oracle, and Stage 4 portal |
| `docker/` | Placeholder; challenge orchestration not yet implemented |
| `docs/` | Existing architecture image `pt.png`; diagram update/review pending |
| `.private/` | Auto-generated flags, Stage 1 player distribution, and server-only verification manifest; ignored |
| `tools/` | Public setup tool; generates per-deployment answers without committed secrets |
| `scripts/` | Local-only authoring and validation tools; excluded from Git |
| `README.md` | Project overview |
| `update.md` | Detailed implementation plan |

Target stage folders:

```text
stages/
  stage1-osint/
  stage2-stego/
  stage3-crypto/
  stage4-web/
  stage5-scripting/
  stage6-reverse-engineering/
  stage7-linux/
  stage8-network/
```

All eight stage folders listed above already exist. Stages 5–8 currently contain placeholders.

The dashboard currently has two authentication API routes and a challenge-card component. The flag form is empty. Pages, root layout, shared styles, database migrations, verification, scoring, and leaderboard remain to be built. Several auth imports are missing from the dependency manifest.

## Current progress

- [x] Eight-stage concept and hybrid delivery plan documented.
- [x] Initial repository folders created.
- [x] Initial Stage 2 image/audio assets added.
- [x] Next.js migration and implementation plan documented.
- [x] Align folders with the eight-stage plan.
- [ ] Implement the Next.js dashboard and database.
- [x] Complete and validate the standalone Stage 1 website and metadata clue path.
- [ ] Complete and validate Stage 2 puzzle.
- [x] Implement and locally test the Stage 4 container.
- [ ] Validate Stage 3 against the report and implement Stage 5.
- [ ] Provision and validate Stage 6–8 VMs.
- [ ] Test scoring, hints, permissions and duplicate submissions.
- [ ] Test remote lab access, isolation and challenge resets.
- [ ] Deploy and run the complete player journey.

Asset presence does not confirm a working challenge. Stage 2 has a generation script, but end-to-end challenge validation is pending. Organizer-only Stage 1 build/check scripts are kept locally and excluded from commits. Stage 4 tests are available with `cd stages/stage4-web` followed by `python3 -m unittest -v test_app.py`.

## Working on the project

Clone the repository using your configured GitHub authentication:

```bash
git clone https://github.com/Shenal-PA/shadownet-ctf.git
cd shadownet-ctf
git fetch origin
```

Select the branch assigned to your work. Stage 1 and Stage 4 startup instructions are above; the dashboard is not yet runnable as a complete application.

| Responsibility | Contributor / branch |
|---|---|
| Stages 1, 4, 5 and 7 | Shenal — `dev-shenal` |
| Next.js dashboard | Dashboard teammate — `dev` |
| Stages 2, 3, 6 and 8 | Confirm ownership with the team |
| Shared deployment and integration | Coordinate between contributors |

Stages 1 and 4 have been implemented locally. Shenal’s next unimplemented stage is Stage 5, followed by the Stage 7 VM. Coordinate dashboard integration and other stage ownership with the team.

Use focused commits and review the destination branch before opening a pull request. The planned integration flow is `dev-shenal` → `dev`, followed by reviewed integration into `main`. Documentation-only changes may be reviewed separately.

## Lab boundaries

These intentionally vulnerable challenges are for authorised educational use inside the project lab. Keep challenge networks separate from platform accounts, scores and unrelated systems.

Keep real credentials, server-only keys and solution material out of player-facing assets. Validate flags and award scores on the server. See [update.md](update.md) for the migration reference corrections and detailed testing checklist.

## Academic context

**Module:** IE3132 — Penetration Testing  
**Programme:** BSc (Hons) IT, SLIIT

The design/planning milestone and the working implementation are separate deliverables. This README reports implementation progress without implying that the complete CTF has already been delivered.

## Remaining implementation sequence

1. Confirm Stage 1/4 private configuration, local testing, and commits.
2. Build and test Stage 5’s LCG prediction service in its own local Docker network.
3. Review Stage 2/3 against the report, including solve paths and source flag handling.
4. Complete the dashboard and database with server-side flag hashes and atomic scoring.
5. Provision and validate the Stage 6/7 VMs and the Stage 8 two-host isolated lab.
6. Integrate connection instructions, resets, player testing, and assignment evidence.

Keep real flags, passwords, signing keys, and organizer solutions outside Git.
Sample credentials used only as synthetic lab/test fixtures are not real account secrets.
Previously committed answers remain in Git history and are retired; ignoring a file
does not erase that history. Never publish the repository root as the player website.
