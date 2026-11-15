# Token Radar — pre-token protocols ranked by implied value

A make.fun entry for **token-radar-01**: a static dashboard that ranks pre-token DeFi protocols
by what a token would be worth if the protocol's record stayed as it is, with a farm plan for each
one. Built from the sealed DefiLlama snapshot (`input/snapshot.json`, 758 protocols, fetched
2026-11-14).

## The model (radar-2)

Implied value is a comparable-multiple valuation, computed from the snapshot itself:

```
multiple(category) = median(mcap / TVL of traded protocols in the category),
                     shrunk toward the global median (k = 3),
                     only when the category has >= 3 traded protocols;
                     thinner categories take the global median (0.2138x)
implied = TVL x multiple x growth x maturity
growth   = 1 + clamp(change_7d, -60, 120) / 100 x 0.6
maturity = 0.6 + min(age_days, 1095) / 1095 x 0.4
```

No protocol name is ever special-cased. The board ranks 178 pre-token protocols: the 40
watchlist slugs plus every other rankable pre-token protocol below the $50M floor. Wrapped,
staked and bridged products of a token that already trades — and the arms of a protocol that
already has one — are not ranked. Live-token protocols are shown separately with the market's
own values and serve as the comparables.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json|directory>
```

Writes `out/board.json` (178 rows, each with a 7-step farm plan), `out/data.js`,
`out/dashboard/`, `out/screenshots/` and `out/dossier.json`. Serve `out/` and open
`dashboard/index.html`. Screenshots: `?shot=board`, `?shot=detail`, `?shot=filtered`.

## Files

- `main.ts` — the entry program (Node 22, stdlib only)
- `lib/model.ts` — the radar-2 model, farm plans, and the board validation
- `dashboard/` — the static page (index.html, app.css, app.js; no network)
- `screenshots/` — board, detail, filtered views
- `vendor/makefun-board.ts` — make.fun's dossier library, copied unchanged
