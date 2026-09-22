# Contributing

Contributions are welcome through GitHub pull requests.

## Workflow

1. Fork the repository and create a focused branch.
2. Make the change and regenerate affected charts with `npm run export`.
3. Add a concise entry under `Unreleased` in `CHANGELOG.md`.
4. Verify `npm run check` and inspect the generated PNG and SVG output.
5. Open a pull request and explain the source for any new game data.

Pull requests cannot merge until the repository owner approves them. Direct pushes to the default branch are disabled by the GitHub ruleset. New commits dismiss earlier approval so the final version is reviewed.

## Data changes

- Prefer Tarkov.dev for item statistics, armor slots, prices, traders, barters, crafts, and quests.
- Use the Escape from Tarkov Wiki for default plate configurations when the API does not identify installed plates.
- Do not infer uncertain protection or availability. Mark it unresolved or add a documented reviewed override.
- Record the collection date and preserve source links.

## Changelog format

Put user-visible changes under `Added`, `Changed`, `Fixed`, or `Removed` beneath `Unreleased`. Planned work stays under `Planned` until implemented.

