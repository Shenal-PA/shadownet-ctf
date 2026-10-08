# ShadowNet CTF

An eight-stage Capture The Flag project for **IE3132 — Penetration Testing, SLIIT**.

**Status: early implementation.** Stage 1 is a complete standalone static OSINT challenge with a company website, twelve staff profiles, and a metadata puzzle. Stage 4 is implemented and tested locally. Stage 2 assets and a Stage 3 oracle are present; the dashboard is partial and the full platform is not yet runnable or deployed.

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
| [SETUP.md](SETUP.md) | Contributor setup, local run commands, testing and dashboard integration |
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
| `tools/` | Contributor setup utilities |
| `README.md` | Project overview |
| `SETUP.md` | Contributor setup and integration guide |
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

Asset presence does not confirm a working challenge. Stage 2 has a generation script, but end-to-end challenge validation is pending. Contributor setup and verification instructions are in [SETUP.md](SETUP.md).

## Working on the project

Clone the repository using your configured GitHub authentication:

```bash
git clone https://github.com/Shenal-PA/shadownet-ctf.git
cd shadownet-ctf
git fetch origin
```

Select the branch assigned to your work, then follow [SETUP.md](SETUP.md). The dashboard is not yet runnable as a complete application.

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
