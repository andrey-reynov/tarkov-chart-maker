# Changelog

All notable project changes are documented here. Add an entry under **Unreleased** in every pull request that changes code, data, generated charts, or behavior.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.

## Unreleased

### Planned

- Review event and Arena acquisition overrides as new equipment is introduced.

### Added

- Plain HTML, CSS, and JavaScript offline website in `release/site/`, with local data and image files.
- Three-section guide with Armor + Rigs, Helmets, and Ammo tabs; Armor + Rigs is the default view.
- Helmet coverage from the supplied vector, with top, back, ear, and other protected zones.
- Caliber-grouped ammo view with a caliber dropdown and class penetration comparison.
- Full helmet and ammo SVG/PNG exports, with individual ammo-caliber PNGs in the release.
- Locally cached helmet and ammo artwork, trader portraits, and a square flea-market icon.
- Offline release copies of all equipment images and trader portraits, with all three guide sections in the single HTML file.
- Body armor, armored rig, and combined chart generation.
- Editable SVG and PNG exports with item artwork.
- Front and back coverage previews for default plates and soft armor regions.
- Armor classes for torso, sides, groin, rear groin, collar, and upper arms.
- Class grouping, repeated column headers, and a continuous class color strip.
- Local browser interface with filtering, sorting, and SVG export.
- Acquisition information for trader sales, estimated barter cost, flea market, craft, quest reward, and FIR or special availability.
- Reviewed acquisition override file for event, Arena, quest, and other exceptional availability.
- Typo-tolerant web search that matches names, variants, and acquisition sources from any position.
- One-command release builder for a self-contained offline HTML website, full PNG charts, per-class PNG charts, and a ZIP package.
- Release source archive with separate item PNG artwork, saved armor and plate data, and editable coverage SVG masters.

### Changed

- Colored the outlines of protected helmet regions to match their fill; unprotected regions retain the original gray outline.
- Kept the glasses outline visible when its protection color is applied, marked unknown top/back/ear coverage with `?`, and narrowed helmet zone columns.
- Helmet charts now place durability after coverage icons, show compact per-zone armor classes, and group weight, movement, ergonomics, and hearing in Details.
- Helmet rows now repeat the armor class number in the colored class strip.
- The offline website folder is the recommended release format instead of the single-file wrapper.
- Replaced the helmet coverage icon with owner-drawn front and back SVGs; shell, ears, eyes, face/jaw, throat, and back neck can now color independently where the data supports them.
- Kept the lower back-of-head shape and collar neutral; only the separate throat and back-neck regions receive helmet coverage colors.
- Trader labels now put the trader before “barter”; acquisition icons sit beside names and prices.
- Helmet refresh selects items by their helmet armor properties, including newer protective headwear lacking the legacy type tag.
- Gear labels use linked Wiki titles where available, and barter prices for ammunition are estimated per round.
- Chart details use weight, speed, and ergonomics symbols in place of the Material column.
- Replaced the four Material, Weight, Speed, and Ergo columns with one compact multiline Details column.
- Reduced armor previews to approximately 92% while preserving row height.
- Tightened equipment spacing to devote more room to useful data.
- Replaced the bottom armor legend with Battlestate Games ownership, source attribution, and accuracy notices.
