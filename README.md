# Poker Probability Calculator

React + Vite frontend that computes Texas Hold'em win/tie/lose probabilities using a Monte Carlo simulation.

## Quick start

Prerequisites:
- Node.js 18+ (or compatible LTS)
- npm (bundled with Node)

Install dependencies:

```bash
cd poker-probability-calculator
npm install
```

Run development server:

```bash
npm run dev
# then open http://localhost:5173 in your browser
```

Build for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## What this repo contains

- `index.html` — Vite entry HTML
- `src/` — React source code
- `public/` — static assets
- `package.json` — scripts and dependencies

## Usage

- Use the UI to enter player hole cards and community cards. The app runs Monte Carlo trials to estimate win / tie / lose probabilities.
- The simulation parameters (trial count, random seed) can be adjusted in the UI or in the source if you need reproducible results.

## Development notes

- Linting and formatting are configured via the included ESLint setup.
- If you add new dependencies, run `npm install` and ensure the app still builds with `npm run build`.

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-change`
3. Commit your changes and open a PR

## License

This project is licensed under the terms in `LICENSE`.

