# Stage 1 — First Contact

The complete static NexaCorp OSINT challenge lives in `stages/stage1-osint/`.
It includes a company homepage, newsroom, twelve individual staff profiles,
a staff directory, and ten local images. No Node.js or database is required.

## Run locally

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory stages/stage1-osint
```

Open `http://localhost:8000`. Stop with Ctrl+C.

Publish only the contents of `stages/stage1-osint/` for players. Preserve the
original image bytes: image optimisation, metadata stripping, and re-encoding
can destroy the challenge. Serve Daniel's downloadable PNG directly.

## Player briefing

**First Contact · OSINT · Easy**

NexaCorp’s public website looks ordinary, but someone on its infrastructure
team may have left more in the public archive than they intended. Investigate
the company, identify the right employee, and recover the hidden flag from
an original public image. Everything you need is on this website.

Suggested hints, released separately by the dashboard:

1. Company updates can connect a department to an employee.
2. The infrastructure refresh mentions an original photograph.
3. Download the original image and inspect its metadata, including comments.

## Maintenance

Edit company copy and staff records in `scripts/build_stage1.py`, then run:

```sh
python3 scripts/build_stage1.py
python3 scripts/validate_stage1.py
```

The builder regenerates HTML only and preserves images and metadata. Edit
`stages/stage1-osint/styles.css` directly for appearance changes. The legacy
`employee-profile.html` URL remains a copy of Jordan Lee's profile.

The static challenge is complete independently of the platform. Flag
submission, points, and player accounts still require the dashboard team's
server-side implementation. Do not add the answer to browser JavaScript.

See [organizer notes](organizer.md) for the solution and metadata reset steps;
keep that document outside the published stage directory.
