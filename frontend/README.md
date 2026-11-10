# DeadlineOS — Frontend

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the landing page, or http://localhost:3000/dashboard for the app.

## Structure

```
app/
  layout.tsx           Root layout — fonts, metadata, ThemeProvider, no-flash script
  globals.css           Tailwind entry + light/dark CSS variables + animation keyframes
  page.tsx               Public landing page (route: /)
  dashboard/page.tsx      Authenticated dashboard (route: /dashboard) — not yet gated by auth
  login/page.tsx           Placeholder login route
  signup/page.tsx           Placeholder signup route

components/
  theme/
    theme-provider.tsx     Light/dark context, persists to localStorage, defaults to dark
    theme-toggle.tsx         Sun/moon toggle button used in the navbar

  marketing/
    navbar.tsx              Responsive navbar: logo, links, theme toggle, log in/sign up, mobile drawer
    hero.tsx                  Headline + the chaos-to-order animation (the core explainer visual)
    how-it-works.tsx           3-step capture -> AI organizes -> reminder section
    showcase.tsx                 Grid of what DeadlineOS captures (jobs, hackathons, etc.)
    footer-cta.tsx                 Closing call to action
    site-footer.tsx                 Minimal footer
    reveal.tsx                       Scroll-triggered fade-up wrapper, reduced-motion aware

  layout/                    Dashboard-only: sidebar, mobile nav, top bar
  capture/                    Dashboard-only: quick-input + drop-zone capture panel
  dashboard/                  Dashboard-only: stats, filters, cards, countdown ring

lib/
  types.ts              Shared TS types (mirrors future Prisma schema)
  mock-data.ts            Placeholder data until the API is wired up
  utils.ts                  cn() helper, urgency band logic

tailwind.config.ts    Color tokens are CSS variables (see globals.css) so the whole app
                       — landing and dashboard — switches between light and dark together.
                       darkMode: "class" toggled on <html> by ThemeProvider.
```

## Theming

Colors are defined as CSS variables in `app/globals.css` under `:root` (light) and `.dark`
(dark), and every component references the Tailwind tokens (`bg-base`, `text-ink`, etc.) —
never raw hex — so a new theme is a two-block CSS edit, not a find-and-replace across
components. The choice persists in `localStorage` under `deadlineos-theme`, and an inline
script in `app/layout.tsx` applies it before paint to avoid a flash of the wrong theme.

## Wiring to the backend (next steps)

Both capture components currently just `console.log` what they receive.
Replace the `TODO`s in `components/capture/capture-panel.tsx` with real
calls once the API exists:

- `handleQuickSubmit` -> `POST /api/opportunities/capture` with
  `{ type: "text" | "link", content: value }`
- `handleFilesAdded` -> `POST /api/opportunities/capture` (multipart) with
  the file(s), routed through the file-handling service to the AI
  extraction service

`lib/mock-data.ts` should be replaced by a real fetch (e.g. a
`GET /api/opportunities` call in a server component or via a small
`lib/api-client.ts`) once the DB and API are live — the component
props (`Opportunity[]`, `DashboardStat[]`) are already typed to match
what the API will eventually return.

The `/dashboard` route is not yet protected — that lands with the Auth feature
(JWT middleware + redirect unauthenticated visitors to `/login`).
