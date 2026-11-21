# vice-city-platinum-path

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/ocha-works/vice-city-platinum-path/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/ocha-works/vice-city-platinum-path/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Vice City Platinum Path** — an offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI. It is a static web app: open it in a desktop browser and it works with the network off, fetching nothing.

- **The official list, tracked.** Every one of the 55 trophies with its official name, description and grade as PlayStation publishes them (1 platinum, 2 gold, 6 silver, 46 bronze). Tick trophies off as you earn them; progress is saved in the browser (localStorage), can be exported to a file and imported back, and counted trophies (250 stunts, 42 shooting-range challenges, 100 WAiNK locations, the money totals…) carry their own counters that tick the trophy when the count lands.
- **Filters and a spoiler shield.** Filter by kind — story, missable watch, collectibles, activities, completion — by grade, or by search; hide what you have earned. The spoiler setting hides the names and descriptions of story trophies until they are earned.
- **A roadmap to the platinum.** Six stages built from the official descriptions: the story chapters and named missions in order, the stranger strands, the collectible sets and counts, the activity grinds, the free-roam feats and money, and the 100% trophy to close.
- **Missable watch, honestly labelled.** GTA VI is not out yet, so no trophy is *confirmed* missable. The watch list flags the eight trophies whose official wording suggests a choice, a partner who must be present, or a one-off moment — caution flags read from the descriptions, with the save habits that protect against each.
- **A cited guide for every trophy.** Each trophy's guide is written for this entry, in our own words, and names its sources beside it: the official PlayStation 5 trophy list (as listed by PSNProfiles and Exophase) and, where the guide leans on announced facts such as the two protagonists, Rockstar Games' official GTA VI page and trailers. No Rockstar logo, artwork or game screenshot is used anywhere; the look is our own.

## Run it

Serve `app/` with any static file server and open `index.html` in a desktop browser — or, with Node 22.18 or later:

```sh
node serve.ts          # serves app/ at http://localhost:8080
```

The hand-in program copies `app/` and `screenshots/` to the output directory and writes the `dossier.json` summary there:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node 22.18 or later, standard library only, no build step and no network. Running it twice writes the same bytes.

## What is in the repository

- `main.ts` — the hand-in program: it checks the entry against the gate's caps (screenshot count and size, a guide for every trophy, the app size caps), copies `app/` and `screenshots/` out, writes `dossier.json` with the vendored library, and reads the output back to verify it.
- `app/index.html`, `app/style.css`, `app/app.js` — the guide itself: the checklist and tracker, the filters and spoiler shield, the roadmap, the missable watch list, and one cited guide per trophy in a detail panel.
- `app/data/trophies.json` — the data: the 55 official names, descriptions and grades, each with its kind, its count where PlayStation tracks one, its missable watch flag where the wording calls for one, its guide and its sources.
- `screenshots/` — four captures of the guide running in a desktop browser (the tracker, one trophy's guide open, the roadmap, the spoiler shield at work); `shots.json` says what each one shows.
- `serve.ts` — a tiny static server for trying the app locally.
- `vendor/makefun-frontend.ts` — the competition kit's dossier library, vendored unchanged, as the bounty requires.

---

<sub>Entered on [make.fun](https://make.fun/?ref=yhjp53pb&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
