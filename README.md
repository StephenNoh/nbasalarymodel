# NBA Salary Model

A salary projection model for NBA players that estimates current-year value and projects salary over the next five seasons.

---

## Overview

This model calculates what an NBA player *should* earn based on their on-court impact and playing time. It answers the question: **Is this player overpaid or underpaid relative to their production?**

---

## Core Formula

At its simplest:

```
salary = impact × playing_time
```

More specifically:

```
salary = (total_minutes / 1475) × (DARKO + 3) × 4.32
```

Where:
- **`1475`** — Average minutes played per season by a non-replacement-level player
- **`DARKO`** — The player's DARKO rating (an adjusted plus-minus metric)
- **`+3`** — Baseline adjustment (replacement-level players have approximately -3 DARKO)
- **`4.32`** — Average cost of a win in 2025-26 dollars (in millions)

---

## Methodology

The foundational approach comes from Chapter 7 of Seth Partnow's book *The Midrange Theory*. The general process:

1. Select an adjusted plus-minus metric (this model uses DARKO)
2. Multiply by possessions/minutes
3. Apply the cost of an average win
4. Output a contract valuation

### Why DARKO?

[DARKO](https://apanalytics.shinyapps.io/DARKO/) (created by Kostya Medvedovsky) was chosen for two reasons:

1. It was ranked as the best APM metric in a survey of NBA personnel and analytics professionals
2. It's designed to be **predictive** (forward-looking) rather than purely descriptive (backward-looking)

---

## Key Features

### User-Controlled Minutes Projections

> *The biggest problem with any win projection or salary model is inaccurate minutes projections.*

Most models use external minutes projections (e.g., Kevin Pelton's), but being wrong on minutes can make an otherwise good model look terrible.

**This model lets you input your own minutes projection.** If you follow a team closely, you likely have better insight into rotation decisions than any algorithm.

### Adjustable DARKO Values

If you believe the DARKO rating is off for a particular player, you can manually adjust it to reflect your own assessment.

### Built-in Aging Curve

The model applies an aging curve to project how a player's value will change over time.

### Salary Cap Inflation

Future year projections incorporate estimated salary cap increases (data sourced from RealGM).

### Win Value Scaling

Not all wins are created equal. Going from 60 to 65 wins is far more valuable than going from 20 to 25 wins—MVP-caliber players enable those extra wins at the top.

The model applies a scaling curve:
- **+10% bonus** for MVP-caliber players
- **-10% penalty** for replacement-level players

This helps explain why max-contract superstars are often *still underpaid* relative to their impact.

---

## Limitations & Future Improvements

### Current Limitations

- **No positional adjustments** — Small guards and centers should arguably be penalized; wings should be rewarded
- **No defensive targeting data** — Players who get "pigeoned" (frequently targeted on defense) may be overvalued
- **Generic aging curve** — Should ideally be position-specific
- **Contract options not reflected** — Team/player options and non-guaranteed money aren't displayed (verify details at [Spotrac](https://www.spotrac.com))

### Planned Improvements

1. **Positional value adjustments** — Penalize positions with less scarcity, reward high-value positions
2. **Defensive targeting component** — Incorporate "pigeon" data (tracked by Todd Whitehead using Synergy data) to devalue defensively-limited players
3. **Position-specific aging curves** — Guards and bigs age differently
4. **Contract structure details** — Display options and guarantees

---

## Data Sources

| Data | Source |
|------|--------|
| Player impact metric | [DARKO](https://apanalytics.shinyapps.io/DARKO/) |
| Salary cap projections | [RealGM](https://www.realgm.com) |
| Contract verification | [Spotrac](https://www.spotrac.com) |

---

## Credits

- **Salary Model**: [Steph Noh](https://bsky.app/profile/stephnoh.bsky.social)
- **DARKO Metric**: Kostya Medvedovsky
- **Methodology Reference**: *The Midrange Theory* by Seth Partnow (Chapter 7)

---

## Technical Notes

### Key Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `REPLACEMENT_LEVEL` | `-3.0` | DARKO baseline for replacement-level player |
| `MINUTES_BASELINE` | `1475` | Average minutes for non-replacement player |
| `WIN_COST_2025_26` | `4.32` | Cost per win in millions (2025-26 dollars) |
| `MVP_BONUS_CAP` | `0.10` | Maximum bonus/penalty (±10%) |

### Inflation Scalers (Future Seasons)

```javascript
const INFLATION_SCALERS = {
    "2026-27": 1.074,
    "2027-28": 1.127,
    "2028-29": 1.184,
    "2029-30": 1.240,
    "2030-31": 1.305
};
```

---

*DARKO data last updated: January 28, 2026*
