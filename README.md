# Tarkov Chart Maker

Tarkov Chart Maker generates large, editable equipment charts for *Escape from Tarkov*. The current release covers body armor and armored rigs. It combines in-game item artwork, current statistics, default plate classes, and a compact front/back protection diagram.

The generated deliverables are:

- `outputs/body-armor.png` and `.svg`
- `outputs/armored-rigs.png` and `.svg`
- `outputs/armor-and-rigs.png` and `.svg`

The combined chart groups equipment by armor class from 6 to 1 and orders each class by effective durability. The SVG output remains editable: every armor region has a stable name, and the generator changes its fill according to the recorded protection class.

## How to use

Give this repository to your AI coding agent and ask it to generate or update the charts.

Example request:

> Update the Tarkov armor data and images, regenerate every chart, inspect the PNG output for layout problems, and summarize any unresolved source matches. Follow `CONTRIBUTING.md` and update `CHANGELOG.md`.

The agent should run the existing refresh and export scripts, preserve the named SVG layers, visually inspect the results, and avoid guessing when sources disagree.

For manual use:

```text
npm install
npm run refresh
npm run plates
npm run images
npm run export
npm run serve
```

Open `http://localhost:4173` for the searchable browser view. Search is typo tolerant and matches partial names, variants, and acquisition sources even when the query does not begin with the first word.

## Sources

- [Tarkov.dev](https://tarkov.dev/) and its [static JSON API](https://json.tarkov.dev/endpoints): item statistics, armor slots, soft armor, prices, and transparent item artwork.
- [Escape from Tarkov Wiki — Armor vests](https://escapefromtarkov.fandom.com/wiki/Armor_vests): default body-armor plates.
- [Escape from Tarkov Wiki — Chest rigs](https://escapefromtarkov.fandom.com/wiki/Chest_rigs): default armored-rig plates.

The saved snapshot contains 108 armored items: 49 body armors and 59 armored rigs. Source dates are printed in the generated charts.

## Acquisition reasoning

The Obtain column chooses the first available source in this order: direct trader cash offer, cheapest estimated barter, flea market, hideout craft, quest reward, then a conservative FIR/special fallback. A tilde before a price means it is an estimate based on the current market value of consumed barter or crafting ingredients.

Public feeds do not always distinguish event, Arena, and other limited availability reliably. `data/acquisition-overrides.json` exists for reviewed exceptions; uncertain cases are never assigned a specific source by guesswork.

## Coverage reasoning

Default plates take precedence in the front, back, and side plate regions. When no default plate is recorded, the diagram shows the matching soft-armor class from Tarkov.dev. Groin, rear groin, collar, and left/right upper-arm protection use their separate armor slots.

Gray means no protection is recorded for that schematic region. A question mark means the default plate configuration could not be verified against the Wiki table; it does not erase known soft armor underneath. Installed plates can differ from the default configuration.

The diagrams are deliberately schematic. They explain equipment coverage and do not reproduce exact game hitboxes.

## Known data cases

- Module-3M is soft armor only, so its front, back, and sides use its class 2 soft-armor slots.
- Redut-T5 includes separate collar, upper-arm, groin, and rear-groin soft armor.
- The six PLATEminus V2 rows are distinct configurations: four armored rigs and two body-armor variants. Their saved armor statistics match, while weight and storage configuration differ. Their default plates remain unverified in the current Wiki match.

## Project structure

- `data/` — saved item and plate data
- `data/acquisition-overrides.json` — reviewed special acquisition labels
- `assets/icons/` — locally cached transparent item artwork
- `assets/armor-front.svg` and `assets/armor-back.svg` — named editable coverage masters
- `scripts/refresh.mjs` — refresh item data
- `scripts/wiki-plates.mjs` — refresh default plate matches
- `scripts/upgrade-images.mjs` — refresh high-resolution artwork
- `scripts/chart.mjs` — SVG chart renderer
- `scripts/export.mjs` — SVG and PNG export

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Every pull request must update the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md). A GitHub check enforces this requirement, and the default branch is intended to require approval from `@andrey-reynov` before merging.

## Disclaimer

This is an unofficial fan project. *Escape from Tarkov* and its game content and imagery belong to Battlestate Games and their respective rights holders. Tarkov.dev and the Escape from Tarkov Wiki are community data sources. Generated charts can lag patches or contain incomplete source matches; the current game is authoritative.
