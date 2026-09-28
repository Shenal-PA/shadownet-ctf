# ShadowNet CTF — Project Update and Implementation Plan

Updated: 2026-09-28  
Status: Planning and early challenge preparation; dashboard implementation pending.

## 1. Purpose and current status

ShadowNet CTF is a browser-accessible CTF platform with eight challenges around the fictional company NexaCorp. Players progress through different security domains, submit flags, earn points, and view a leaderboard. The intended visual style is black, green, and red.

This document records the updated plan following the original six-stage design and the decision to host the dashboard online. It describes planned work, not a completed or production-ready system.

Repository inspection of `dev-shenal` at commit `2fc577ff912a925e5571af8bbcfa606b94769e61` showed:

- The README and folder names still reflect the original six-stage plan.
- No Next.js dashboard source or package manifest is present.
- Most challenge folders and the Docker folder contain placeholders only.
- Stage 2 contains `whistleblower.jpg`, `message.wav`, and `passphrase.txt`.
- Stage 2's `generate_spectrogram.py` is empty.
- The architecture image is stored at `docs/pt.png`; its contents were not revalidated in this inspection.
- Existing challenge assets have not yet been tested end to end.

The dashboard teammate has confirmed through Shenal that the new dashboard has not yet been built. The supplied `updated_nextjs.md` is a migration reference, not evidence of implementation.

## 2. Updated platform direction

| Component | Earlier plan | Updated plan |
|---|---|---|
| Dashboard UI | Flask templates | React through Next.js, with TypeScript |
| Dashboard backend | Flask routes | Next.js API routes |
| Platform database | SQLite | Supabase PostgreSQL |
| Dashboard hosting | Initially no online hosting plan | Vercel is the planned dashboard host |
| Challenge delivery | Six-stage hybrid design | Eight stages: 2 static, 3 Docker, 3 VM-based |

Only the dashboard/platform is being migrated. Python remains part of the challenge services where required. For example, the Stage 4 intentionally vulnerable Flask application is separate from the secure platform dashboard.

Hosting selection does not mean deployment is complete. Current service limits, supported framework versions, access requirements, and infrastructure costs must be checked during deployment planning. Do not assume the entire Docker/VM lab will be free because the dashboard uses a free hosting plan.

## 3. Eight-stage challenge plan

| Stage | Title | Domain and intended task | Delivery |
|---|---|---|---|
| 1 | First Contact | OSINT: follow mock company/employee clues and inspect image metadata | Static web files |
| 2 | Frequency | Image + audio steganography: extract an image clue, find/access the audio, read encoded text from its spectrogram, then decode the flag | Static web files |
| 3 | Broken Cipher | Cryptography: interact with a live Vigenère oracle and recover the information needed to decrypt the flag | Docker |
| 4 | Front Door | Web security: exploit the intended SQL injection in a fictional login portal | Docker |
| 5 | Automate It | Scripting: collect LCG service outputs and predict the next token | Docker |
| 6 | Decompiled | Reverse engineering: analyse a challenge ELF binary inside an Ubuntu analysis VM | Ubuntu VM |
| 7 | Under the Hood | Linux security: start as a low-privilege user and exploit a deliberate lab misconfiguration | Ubuntu VM |
| 8 | Full Breach | Networking capstone: use the intended Entry Host SSRF/pivot path to reach the internal DB Host | Two Ubuntu VMs |

Planned progression: Stage 1 easy; Stage 2 easy–moderate with guided clues; Stages 3–5 moderate; Stages 6–7 moderate–hard; Stage 8 hard. Validate difficulty through player testing.

**Infrastructure count:** two static stages, three Docker services, and three VM-based stages using **four actual VMs**: RE, Linux, Entry, and DB.

Stage 2 must use both an image and audio. The requested audio format was MP3, while the current repository contains WAV. Finalise the player-facing format only after verifying that the encoded spectrogram remains readable in the distributed file.

## 4. Architecture and player flow

The platform and intentionally vulnerable challenge environments have separate responsibilities:

- **Next.js dashboard:** registration/login, challenge descriptions, asset links, connection instructions, flag submission, progress, hints, and leaderboard.
- **Supabase:** platform accounts/profile data, challenge metadata, protected flag-verification data, submissions, and scores.
- **Static assets:** player-facing Stage 1–2 pages and downloads.
- **Separate Docker host:** live Stage 3–5 challenge services.
- **Isolated VM lab:** Stage 6–8 machines and their intended network paths.

Player flow:

1. Register or log in to the dashboard.
2. Open a challenge and read its instructions.
3. Download static assets or connect to the specified lab service.
4. Solve the challenge using the appropriate local tools.
5. Submit the recovered flag to the dashboard.
6. The server validates the flag and awards points once; progress and leaderboard update.

Stage 3 and Stage 5 are planned TCP/socket services. Their connection instructions must identify a host and port; treating those services as HTTP APIs does not automatically make them accessible.

Remote players need an explicit route to the lab, such as an authenticated VPN or a separately designed lab gateway. A private VM IP or localhost address alone is not a remote-access solution. Finalise and test this before declaring the hosted platform usable.

The **Stage 8 DB VM** is an intentionally vulnerable challenge target. It is not the platform's Supabase database. Players should reach it only through the intended capstone network path.

Using VMs is a design choice for OS behaviour, isolation, and reproducible lab environments. Multi-host networking is not exclusive to VMs, and adding VMs alone does not make a challenge more advanced.

## 5. Responsibilities and branches

| Work | Owner / branch |
|---|---|
| Stages 1, 4, 5, and 7 | Shenal — `dev-shenal` |
| Next.js dashboard | Dashboard teammate — `dev` |
| Stages 2, 3, 6, and 8 | Confirm remaining ownership with the team |
| Shared architecture, deployment and integration | Coordinate between contributors |

Shenal's planned build order is **Stage 1 → Stage 5 → Stage 4 → Stage 7**.

Use focused commits per stage. Integrate completed work through a pull request from `dev-shenal` into `dev`. Shared folder renames should be coordinated before either contributor starts new work against those paths.

## 6. Proposed folder alignment

Retain existing useful files and align the folder names with the eight-stage plan. These are planned changes; adding this document does not perform them.

| Current folder | Planned folder / action |
|---|---|
| `stages/stage1-osint/` | Keep |
| `stages/stage2-stego/` | Keep; preserve and validate existing assets |
| `stages/stage3-crypto/` | Keep |
| `stages/stage4-web/` | Keep |
| No scripting folder | Create `stages/stage5-scripting/` |
| No RE folder | Create `stages/stage6-reverse-engineering/` |
| `stages/stage5-linux/` | Rename to `stages/stage7-linux/` |
| `stages/stage6-network/` | Rename to `stages/stage8-network/` |

Planned dashboard locations follow the migration reference: root `package.json`, `src/app/`, `src/components/`, `src/lib/`, and `public/assets/`. Agree on this layout with the dashboard owner before scaffolding.

Use `stages/` consistently in build paths; the migration reference also contains `challenges/` paths that do not match this repository. Keep authoring scripts and solution material separate from player-facing public assets.

## 7. Implementation checklist

### Repository preparation

- [ ] Coordinate and apply the folder alignment above.
- [ ] Update README to eight stages and the actual implementation status.
- [ ] Update and verify the architecture diagram.
- [ ] Define challenge IDs, flag format, points, hints and connection metadata.
- [ ] Confirm ownership of the remaining stages.

### Shenal's stages

- [ ] Stage 1: create mock pages, prepare the metadata-bearing image, and verify the full clue path.
- [ ] Stage 5: implement the LCG service and container; verify the intended prediction task is solvable.
- [ ] Stage 4: build the isolated SQLi lab and verify both ordinary and intended challenge behaviour.
- [ ] Stage 7: provision the Ubuntu lab, implement the selected misconfiguration, and verify low-privilege access and recovery.
- [ ] Document setup, connection, intended solution, validation, and reset for each stage.

### Dashboard teammate

- [ ] Scaffold and build the Next.js dashboard.
- [ ] Choose one consistent authentication approach and enforce server-side access checks.
- [ ] Create database migrations and challenge seed data.
- [ ] Implement challenge pages, flag validation, progress, leaderboard and hints.
- [ ] Add authorised admin controls.
- [ ] Test locally before deploying the dashboard.

### Integration and deployment

- [ ] Provision the separate Docker/VM infrastructure.
- [ ] Define remote player access and lab isolation.
- [ ] Publish only intended player-facing assets.
- [ ] Configure environment variables and real connection details.
- [ ] Verify registration → challenge access → solve → submission → score update.
- [ ] Test concurrent submissions and duplicate-solve handling.
- [ ] Test challenge reset/rebuild and database recovery.
- [ ] Record actual hosting costs, limits, and deployment instructions.

## 8. Required corrections to the migration reference

The reference must be reviewed before its snippets are used as application code:

- Registration and login examples return whole user records, including password hashes. Return only explicitly allowed public fields.
- The challenge-list example selects all columns, including flag hashes. Expose only player-visible metadata.
- Define database permissions and row-level security policies consistent with the chosen authentication model.
- Award points atomically and enforce one successful solve per user/challenge; a separate check followed by a score update can race.
- Fetch paid hints only through server-side purchase/unlock logic. Sending all hint text to the browser does not enforce a penalty.
- Align dependencies with imports; the sample imports an auth-helper package absent from its listed dependencies.
- Resolve the local dashboard/Stage 4 port conflict in the sample configuration.
- Replace sample localhost/private addresses with a tested access design.
- Keep real credentials out of Git and keep privileged database keys server-side.
- Do not publish source flags, passphrase preparation files, or solutions alongside player downloads unless they are deliberately part of the puzzle.
- Define reproducible challenge resets; a container restart alone does not necessarily restore its original state.

## 9. Immediate next step

Coordinate the shared folder names, then implement and validate **Stage 1 on `dev-shenal`** while the teammate builds the dashboard on `dev`.

The platform is ready only after the dashboard, individual challenges, lab access, scoring and resets work together in an end-to-end test.
