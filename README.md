# Wise Table Tennis Championship

A configurable sixteen-player championship bracket built with React, Vite,
TypeScript, Tailwind CSS, and shadcn/ui.

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run format:check
npm run build
```

Add shadcn/ui components with:

```bash
npx shadcn@latest add <component>
```

## Tournament configuration

Edit `tournament.config.yml` to change competitors, match status, and set
scores. Every finished match accepts up to three sets using an
`opponent_1_score_opponent_2_score` value such as `"11_7"`.
Sets are played to at least 11 points and require a two-point winning margin,
so deuce results such as `"14_12"` are supported.
Set each match's `date` using the display-ready day and month, such as
`21st July`.

The eight `bracket-16-*` matches form the opening Round of 16. They use
`sets: 1`, so only the `score.first` result is displayed. Quarterfinals onward
default to three sets.

Set the top-level `stage` value to `round-16`, `quarter`, `semi`, or `final`.
The selected stage receives a green underline; every other stage keeps a grey
underline.
