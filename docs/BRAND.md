# Brand Guide — CyberShield360 By Mujtaba

## Logo
- `docs/logo.png` (512×512 app icon) and a scalable `docs/logo.svg`.
- The SVG is also used live in the UI: `clientapp/public/logo.svg` (+ `favicon.svg`) and `frontend/logo.svg`.
- Mark: a faceted **shield** wrapped by a **360° orbit ring** with a central checkmark/keyhole —
  representing all-round, verified security coverage.

## Color palette (signature teal → violet)
| Token | Hex | Use |
|-------|-----|-----|
| brand-500 | `#10B5A6` | Primary accent (buttons, links, charts) |
| brand-600 | `#0E9C90` | Primary hover |
| brand-700 | `#0B7E75` | Active/pressed |
| brand-300 | `#5EE0C2` | Dark-mode accents, highlights |
| brand-50  | `#E8FBF6` | Light tints / active nav background |
| accent-500 | `#7C5CFC` | Secondary (logo gradient end, highlights) |
| ink | `#0B1221` | Logo background / deep surfaces |

Logo gradient: **`#19E3B1` → `#7C5CFC`**.

## Where it's applied
- React app: `tailwind.config.js` brand/accent scales; logo in sidebar + login; teal score-trend chart.
- Static demo (`/frontend`): logo, teal nav + run button + trend line.
- Reports: PDF/Excel default accent `#10B5A6`; seed tenant ships white-label brand on.
- Severity colors (Critical/High/Medium/Low) are intentionally kept on a red→green risk scale for clarity.
