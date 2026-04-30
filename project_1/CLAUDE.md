# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository is for **香茅廚房 Lemongrass Kitchen** — a Thai restaurant's mobile-first online menu, built as a static site and deployed to GitHub Pages. The tech stack is **React 18 + TypeScript + Vite**.

## Development Commands

```bash
npm install
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # Build to dist/
npm run preview  # Preview build output locally
```

## Architecture

### Data Layer (two-tier)

- `src/data/menu-raw.ts` — Human-editable source of truth. Chinese-only, minimal nesting. Restaurant staff edit this file to add/update menu items.
- `src/data/menu-i18n.ts` — Full four-language (zh/en/ja/ko) data consumed by React components. Generated from `menu-raw.ts` (by build script or AI translation). **Do not hand-edit** unless adding `desc` fields.
- `src/data/tags.ts` — Tag code → icon + multilingual label mapping.
- `src/data/site-info.ts` — Store info, dining rules (90 min limit, NT$300 minimum), multilingual constants.

### menu-raw.ts format

```ts
{
  category: 'main' | 'side' | 'dessert' | 'drink',
  name: '中文名稱',
  options: ['270'] | ['烤雞腿 270', '牛肉 340'] | ['時價'],
  tags: ['R', '1', 'B'],   // see tag codes below
  image: '檔名.jpeg' | null,  // files live in public/images/
  emoji: '🍛',
  note: '中文備註或空字串',
}
```

### menu-i18n.ts format (rendered by components)

```ts
{
  id: 'main-001',
  category: 'main',
  names: { zh, en, ja, ko },
  price: [{ label: { zh, en, ja, ko } | null, value: 270 | 'market' }],
  image: string | null,
  emoji: string,
  tags: string[],
  desc: { zh, en, ja, ko },
  note: { zh, en, ja, ko },
}
```

### Tag codes

| Code | Meaning |
|------|---------|
| `R` | 本店推薦 Recommended |
| `1` `2` `3` | 小辣 / 中辣 / 大辣 |
| `P` `B` `L` | 含豬肉 / 含牛肉 / 含羊肉 |
| `V` | 素食 Vegetarian |
| `H` | 清真認證 Halal |

### Component structure

- `Header` — store name, hero image, dining info (multilingual)
- `LanguageSwitcher` — sticky; switches zh/en/ja/ko without page reload
- `CategoryNav` — sticky tab bar; smooth-scrolls to category sections
- `MenuSection` — one section per category
- `MenuCard` — image or emoji fallback, name, price/specs, tag badges
- `ItemDetailModal` — overlay with larger image (pinch-to-zoom), desc, note; closes without scroll reset
- `TagBadge` — icon + multilingual label badge
- `hooks/useLanguage.ts` — language state via React Context

### Key constraints

- **Mobile-only**: 375 px width baseline, no desktop/tablet responsive breakpoints needed.
- **Fully static**: zero API calls at runtime; all data from `src/data/`.
- **Images**: served from `/images/{filename}` (inside `public/images/`). If `image` is null, render the item's `emoji` enlarged.
- **Modal behavior**: lock `body` scroll when open; restore scroll position on close.

## GitHub Pages Deployment

`vite.config.ts` must set `base` to the repository name:

```ts
base: '/<repo-name>/',
```

The GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers on push to `main`, runs `npm ci && npm run build`, uploads `dist/`, and deploys via `actions/deploy-pages`.

In the GitHub repository settings: **Settings → Pages → Source → GitHub Actions**.

## Design Reference

The `menu.pen` file (Pencil.dev design) is readable only via the **Pencil MCP tools** (`batch_get`, `batch_design`). Do not use `Read` or `Grep` on `.pen` files. The detailed design spec is in `menu-design-prompt.md`. The full Claude Code implementation prompt is in `claude-code-prompt.md`.

Color palette: gold/amber as primary (from the restaurant's crown-recommendation icon), white background, dark-gray text.
