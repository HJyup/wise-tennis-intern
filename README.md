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
