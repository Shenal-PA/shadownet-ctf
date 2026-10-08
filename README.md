# ShadowNet CTF

An eight-stage Capture The Flag project for **IE3132 — Penetration Testing, SLIIT**.

**Status: early implementation.** Stage 1 is a complete standalone static OSINT challenge with a company website, twelve staff profiles, and a metadata puzzle. Stage 2 assets and a Stage 3 oracle are present; the dashboard is partial and the full platform is not yet runnable or deployed.

**Stage 1:** [setup and player briefing](docs/stage1/README.md). Run `python3 -m http.server 8000 --bind 127.0.0.1 --directory stages/stage1-osint` and open `http://localhost:8000`.

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

The eight-stage plan below supersedes the original six-stage overview. Folder alignment and implementation are still pending; documentation changes alone do not implement the platform.

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
| `stages/` | Original six-stage folder layout, mostly placeholders; Stage 2 has initial assets |
| `docker/` | Placeholder; challenge orchestration not yet implemented |
| `docs/` | Existing architecture image `pt.png`; diagram update/review pending |
| `shadownet-starter.zip` | Original starter archive |
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

The existing `stage5-linux/` and `stage6-network/` folders are to become `stage7-linux/` and `stage8-network/`. Coordinate those renames with the team.

Planned dashboard paths are `src/app/`, `src/components/`, `src/lib/`, and `public/assets/`, with a root `package.json`. These application files are not present yet.

## Current progress

- [x] Eight-stage concept and hybrid delivery plan documented.
- [x] Initial repository folders created.
- [x] Initial Stage 2 image/audio assets added.
- [x] Next.js migration and implementation plan documented.
- [ ] Align folders with the eight-stage plan.
- [ ] Implement the Next.js dashboard and database.
- [x] Complete and validate the standalone Stage 1 website and metadata clue path.
- [ ] Complete and validate Stage 2 puzzle.
- [ ] Implement Stage 3–5 containers.
- [ ] Provision and validate Stage 6–8 VMs.
- [ ] Test scoring, hints, permissions and duplicate submissions.
- [ ] Test remote lab access, isolation and challenge resets.
- [ ] Deploy and run the complete player journey.

Asset presence does not confirm a working challenge. Stage 2 has a generation script, but end-to-end challenge validation is pending. Stage 1 validation is available through `python3 scripts/validate_stage1.py`.

## Working on the project

Clone the repository using your configured GitHub authentication:

```bash
git clone https://github.com/Shenal-PA/shadownet-ctf.git
cd shadownet-ctf
git fetch origin
```

Select the branch assigned to your work. There is no application startup command yet because dashboard scaffolding and challenge services have not been implemented.

| Responsibility | Contributor / branch |
|---|---|
| Stages 1, 4, 5 and 7 | Shenal — `dev-shenal` |
| Next.js dashboard | Dashboard teammate — `dev` |
| Stages 2, 3, 6 and 8 | Confirm ownership with the team |
| Shared deployment and integration | Coordinate between contributors |

Shenal's build order is **Stage 1 → Stage 5 → Stage 4 → Stage 7**.

Use focused commits and review the destination branch before opening a pull request. The planned integration flow is `dev-shenal` → `dev`, followed by reviewed integration into `main`. Documentation-only changes may be reviewed separately.

## Lab boundaries

These intentionally vulnerable challenges are for authorised educational use inside the project lab. Keep challenge networks separate from platform accounts, scores and unrelated systems.

Keep real credentials, server-only keys and solution material out of player-facing assets. Validate flags and award scores on the server. See [update.md](update.md) for the migration reference corrections and detailed testing checklist.

## Academic context

**Module:** IE3132 — Penetration Testing  
**Programme:** BSc (Hons) IT, SLIIT

The design/planning milestone and the working implementation are separate deliverables. This README reports implementation progress without implying that the complete CTF has already been delivered.
