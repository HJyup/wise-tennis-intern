# Wise Table Tennis Championship

A configurable eight-player championship bracket built with React, Vite,
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

The four `bracket-qualifier-*` matches belong to the non-seeded qualifying
round. They use `sets: 1`, so only the `score.first` result is displayed and
each winner claims one of the four open championship places.

Set the top-level `stage` value to `non-seed`, `quarter`, `semi`, or `final`.
The selected stage receives a green underline; every other stage keeps a grey
underline.
