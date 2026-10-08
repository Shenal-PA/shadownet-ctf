# Stage 1 organizer notes — do not distribute to players

## Intended solve

1. Open the company homepage and follow **Explore our people** or the newsroom.
2. The infrastructure newsroom entry names **Daniel Brooks**, Systems Administrator.
3. Open Daniel's staff profile. His public update mentions original publishing notes.
4. Download `assets/daniel-site-survey.png` using **Download original image**.
5. Inspect the original with `exiftool daniel-site-survey.png`.
6. The PNG `Comment` contains `SHADOWNET{nexacorp_first_contact}`.

Daniel's profile is also directly discoverable in the directory; multiple
public paths are intentional for this beginner OSINT challenge. Other profiles
have biographies and harmless archive attachments, but none contains a flag.
The former flag in `media-kit.jpg` has been replaced by ordinary publishing notes.

## Reset / rebuild

The site has no mutable runtime state; restart the static server to reset it.
Regenerate page content with `python3 scripts/build_stage1.py` when needed.
Restore the intended metadata after replacing or processing the original PNG:

```sh
exiftool -overwrite_original \
  -Comment='SHADOWNET{nexacorp_first_contact}' \
  -Artist='Daniel Brooks / @dbrooks' \
  stages/stage1-osint/assets/daniel-site-survey.png
```

Run `python3 scripts/validate_stage1.py` before distribution. At integration,
configure the same answer in the dashboard's protected server-side verification
store. This document and the validation script are organizer resources.

## Images

Two new photographs were created with the built-in image generation tool:

- `stages/stage1-osint/assets/nexacorp-campus.png`
- `stages/stage1-osint/assets/daniel-site-survey.png`

Final campus prompt: “Use case: photorealistic-natural. Asset type: wide company
website hero photograph. Create a polished realistic editorial photograph for
fictional enterprise technology company NexaCorp: modern glass office campus in
a lush landscaped setting, dusk light, subtle emerald interior lighting, a few
anonymous professionals walking, sophisticated real architectural photography,
black and green website aesthetic, wide landscape composition. No text, no
logos, no watermarks. Save as a project-ready image.”

Final Daniel prompt: “Use case: photorealistic-natural. Asset type: downloadable
workplace photograph on fictional systems administrator Daniel Brooks's staff
profile at NexaCorp. Realistic editorial wide photograph of a modern data centre
aisle, black server racks, neat network cables, soft emerald green status lights,
one anonymous male systems administrator seen from behind checking a rack with
a laptop. Natural detailed professional photography, understated and credible,
no dramatic hacker imagery, no text, no logos, no watermarks. Landscape composition.”

The three existing JPEG press images remain in use. Staff identities are
represented by initials; the generated administrator photo is illustrative.
The `.example` email domain is deliberately reserved for fictional contact
information, so the website does not claim a working sales inbox.
## Additional profile photographs

Five additional photographs were generated using the built-in image generation tool. Together with Daniel’s photo, six profiles now have distinct workplace photographs with matching original-download links. Each additional photo contains ordinary author and archive metadata; only Daniel’s photo contains the flag.

- Saved asset: `stages/stage1-osint/assets/jordan-media-briefing.png`
  Final prompt: Use case: photorealistic-natural. Asset type: downloadable workplace photograph on a fictional NexaCorp employee profile, visually consistent with an infrastructure site-survey photograph. A communications coordinator viewed from behind arranging a company media briefing in a modern conference room, camera equipment and printed materials on a table, no readable text. Realistic polished editorial photography, anonymous professionals, subtle emerald green accents, charcoal equipment, natural office lighting, understated credible enterprise technology workplace in Sri Lanka. Landscape composition. No readable text, no logos, no watermark, no dramatic hacker imagery.

- Saved asset: `stages/stage1-osint/assets/maya-security-workshop.png`
  Final prompt: Use case: photorealistic-natural. Asset type: downloadable workplace photograph on a fictional NexaCorp employee profile, visually consistent with an infrastructure site-survey photograph. A female security analyst viewed from behind at an operations workstation, several monitors with abstract unreadable monitoring charts, calm professional office. Realistic polished editorial photography, anonymous professionals, subtle emerald green accents, charcoal equipment, natural office lighting, understated credible enterprise technology workplace in Sri Lanka. Landscape composition. No readable text, no logos, no watermark, no dramatic hacker imagery.

- Saved asset: `stages/stage1-osint/assets/ravi-data-workspace.png`
  Final prompt: Use case: photorealistic-natural. Asset type: downloadable workplace photograph on a fictional NexaCorp employee profile, visually consistent with an infrastructure site-survey photograph. A data engineer viewed from behind reviewing abstract unreadable data pipeline visualisations on dual monitors at a modern engineering desk. Realistic polished editorial photography, anonymous professionals, subtle emerald green accents, charcoal equipment, natural office lighting, understated credible enterprise technology workplace in Sri Lanka. Landscape composition. No readable text, no logos, no watermark, no dramatic hacker imagery.

- Saved asset: `stages/stage1-osint/assets/alex-research-bench.png`
  Final prompt: Use case: photorealistic-natural. Asset type: downloadable workplace photograph on a fictional NexaCorp employee profile, visually consistent with an infrastructure site-survey photograph. A research associate viewed from behind working at an electronics prototyping bench, small computing boards, testing instruments, tidy applied research workspace. Realistic polished editorial photography, anonymous professionals, subtle emerald green accents, charcoal equipment, natural office lighting, understated credible enterprise technology workplace in Sri Lanka. Landscape composition. No readable text, no logos, no watermark, no dramatic hacker imagery.

- Saved asset: `stages/stage1-osint/assets/ethan-development-studio.png`
  Final prompt: Use case: photorealistic-natural. Asset type: downloadable workplace photograph on a fictional NexaCorp employee profile, visually consistent with an infrastructure site-survey photograph. A software engineer viewed from behind collaborating with a colleague at a laptop and external display in a modern development studio, abstract unreadable editor interface. Realistic polished editorial photography, anonymous professionals, subtle emerald green accents, charcoal equipment, natural office lighting, understated credible enterprise technology workplace in Sri Lanka. Landscape composition. No readable text, no logos, no watermark, no dramatic hacker imagery.
