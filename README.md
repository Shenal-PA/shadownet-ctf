# ShadowNet CTF

A hacker-themed Capture The Flag (CTF) Play Box built for IE3132 - Penetration Testing (SLIIT).

## Theme
Players act as members of an underground hacker collective infiltrating the internal
systems of a fictional corrupt corporation, "NexaCorp". Each stage represents deeper
penetration into the company's infrastructure.

## Stages

| # | Domain | Difficulty | Delivery |
|---|--------|-----------|----------|
| 1 | OSINT / Reconnaissance | Easy | Web |
| 2 | Steganography | Easy | Web |
| 3 | Cryptography | Moderate | Web |
| 4 | Web Security | Moderate | Docker |
| 5 | Linux / System Security | Moderate-Hard | Docker |
| 6 | Networking (Capstone) | Hard | VM Cluster |

## Repo Structure
```
docs/       -> design report, architecture diagram, planning docs
stages/     -> per-stage challenge files (source, configs, hints)
docker/     -> Dockerfiles + docker-compose.yml for Stage 4-5 containers
dashboard/  -> web dashboard source (login, leaderboard, flag validation)
```

## Status
- [x] Design & planning (Assignment 01)
- [ ] Dashboard implementation
- [ ] Stage 1-3 content build
- [ ] Stage 4-5 Docker containers
- [ ] Stage 6 VM cluster setup
- [ ] Full integration testing

## Tech Stack
Ubuntu 22.04 LTS, Docker + Docker Compose, Flask/Node.js, SQLite/PostgreSQL

## Module
IE3132 - Penetration Testing, BSc (Hons) IT, SLIIT
