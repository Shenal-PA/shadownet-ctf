# ShadowNet CTF — Challenge Integration

Stages 1 and 4 run directly after cloning. No separate preparation or flag-import
script is required. Register each deployed challenge’s actual flag through the
main dashboard’s administrator interface. The dashboard teammate adds the
challenge descriptions, links and verification handling.

## Stage 1

Serve `stages/stage1-osint/` directly:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory stages/stage1-osint
```

Open http://localhost:8000. The complete playable pages and metadata-bearing
image are included. When integrating, preserve original image bytes; image
optimisation or metadata stripping can erase the puzzle. Publish only the stage
folder, not the repository root. Its image can also be downloaded and solved
from a public repository; there is no promise of secret static assets in Git.

## Stage 4

```sh
docker compose -f stages/stage4-web/docker-compose.yml up --build -d
```

Open http://localhost:8084. The portal starts without a mandatory `.env` file.
If no `FLAG` is supplied, it creates a flag internally and preserves it in the
`stage4-config` Docker volume. Existing local `.env` flags are still supported.
The temporary application database resets when the container is recreated,
while the generated flag survives in the configuration volume.

For a chosen fixed flag, optionally create an ignored `stages/stage4-web/.env`
containing `FLAG=<your chosen flag>`, then recreate the container. Register that
same value in the main dashboard. Changing a dashboard answer alone does not
change what the challenge displays.

Keep the configuration volume during ordinary resets. Removing it rotates an
automatically generated flag, so the dashboard answer must then be updated.

## Dashboard teammate

1. Merge the stage files.
2. Serve the Stage 1 folder and start the Stage 4 container on the lab host.
3. Add each challenge and its connection URL to the dashboard.
4. The organiser registers the exact deployed flags in the dashboard admin panel.

Flag submission and scoring remain the main dashboard's responsibility. Nothing
in these challenges automatically edits the dashboard database. Real platform
credentials, signing keys and deployment `.env` files remain outside Git.

## Tests

```sh
cd stages/stage4-web
python3 -m unittest -v test_app.py
```
