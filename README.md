# Sengoku Jidai — The Age of Warring States

A persistent, multiplayer strategy, political role-play, military management and diplomacy simulation set in feudal Japan during the **Sengoku / Gekokujō** period. Daimyō rise and fall, vassals scheme and rebel, shinobi slip through the fog of war, and the shogunate is a prize to be seized.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase**, designed to deploy on **Railway** with all game state persisted in **Supabase** (Postgres + Auth + Row Level Security).

---

## Core design principles

- **Resources are deliberately scarce and simple.** The only resources are **Koku**, **Food / Rice**, **Population**, and **Horses**. There is no gold (everything is koku), no construction materials, no separate weapons, no political-influence resource, and no "recruits" resource.
- **Troops come straight out of population.** Raising a unit permanently subtracts from a province's population. Population never grows on its own — only the Game Master can restore it (repopulation, migration, narrative reward). Wars leave lasting scars.
- **Fog of war is enforced in the backend.** A clan sees full details only for provinces it owns, provinces where it has an army, provinces it is actively spying on, or provinces the GM has revealed. Everywhere else it sees only vague public info. This is enforced through Postgres Row Level Security and the visibility layer — not merely hidden in the UI.
- **Loyalty is political, not a meter.** There is no automatic loyalty bar. Rebellion is a deliberate action a vassal chooses to take.
- **Sensitive actions run server-side.** All mutations (recruiting, building, moving armies, battles, espionage, taxes, GM tools, season resolution) go through API routes that re-validate the caller's role using the Supabase service-role admin client.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14.2.x (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (custom Sengoku palette) |
| Auth & DB | Supabase (Postgres, Auth, RLS) |
| Hosting | Railway |
| Icons | lucide-react |
| Toasts | react-hot-toast |

---

## Project structure

```
sengoku-jidai/
├── src/
│   ├── app/
│   │   ├── (app)/              # Authenticated shell: dashboard, map, clans,
│   │   │                       # nation, vassal, army, troops, construction,
│   │   │                       # battles, espionage, shogunate, cemetery,
│   │   │                       # multimedia, gm
│   │   ├── api/                # Server-validated action routes
│   │   │   ├── armies/         #   create, move
│   │   │   ├── battles/        #   orders
│   │   │   ├── buildings/      #   construct
│   │   │   ├── clans/          #   claim-position
│   │   │   ├── gm/             #   edit-clan, edit-province, assign-player,
│   │   │   │                   #   resolve-battle, resolve-siege,
│   │   │   │                   #   force-espionage, shogun, graveyard,
│   │   │   │                   #   announcement, media
│   │   │   ├── nation/         #   update, rebel
│   │   │   ├── ninja/          #   send
│   │   │   ├── provinces/      #   map
│   │   │   ├── seasons/        #   advance (full turn resolution)
│   │   │   ├── shogunate/      #   decree
│   │   │   ├── sieges/         #   orders
│   │   │   ├── taxes/          #   set, pay
│   │   │   └── troops/         #   recruit, reinforce
│   │   ├── auth/               # login, register, choose-clan
│   │   └── layout.tsx, page.tsx
│   ├── components/             # ui/, shared/, map/, panels/
│   ├── lib/                    # supabase clients, auth, game-engine, visibility, utils
│   ├── types/                  # domain TypeScript types
│   ├── styles/globals.css
│   └── middleware.ts           # session refresh + auth gating
├── supabase/
│   ├── schema.sql              # all tables, enums, indexes
│   ├── policies.sql            # RLS helpers + policies (fog of war)
│   └── seed.sql                # season, rules, buildings, units, clans, provinces
├── .env.example
├── railway.json
└── package.json
```

---

## 1. Local setup

**Prerequisites:** Node.js 20 and npm.

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env.local
```

Fill `.env.local` with the values from your Supabase project (see step 2):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
# 3. Run the dev server
npm run dev
# open http://localhost:3000
```

---

## 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **Settings → API**, copy the **Project URL**, the **anon public** key, and the **service_role** key into `.env.local` (and later into Railway).
3. Open the **SQL Editor** and run the three scripts **in this exact order**, each as a separate query:
   1. `supabase/schema.sql` — creates every enum, table and index.
   2. `supabase/policies.sql` — enables Row Level Security and installs the fog-of-war policies and helper functions.
   3. `supabase/seed.sql` — seeds the opening season (Spring 1560), game rules, ~29 building templates, 16 unit templates, 5 starting clans (Oda, Takeda, Uesugi, Mōri, Shimazu) each with a Daimyō + two Vassal seats, ~15 provinces (each with 3 subprovinces and map coordinates), a vacant shogunate, and a welcome announcement.
4. **Auth:** under **Authentication → Providers**, keep **Email** enabled. For the smoothest testing, turn **off** "Confirm email" (Authentication → settings) so new sign-ups can log in immediately. A trigger (`handle_new_user`) automatically creates a `profiles` row and personal resources whenever someone registers.
5. **Storage (optional):** the app stores media as plain image **URLs**, so you do not need Storage to get started. If you want to host images in Supabase, create a public bucket (e.g. `media`) under **Storage**, upload your images, and paste their public URLs into the GM "Media / Lore" tool.

### Create the first Game Master

You can become Game Master in either of two ways (see also the Railway section below):

**By email:** set `GAME_MASTER_EMAIL` and `NEXT_PUBLIC_GAME_MASTER_EMAIL` in `.env.local` to the same address, then register with that email — the account is promoted automatically.

**By SQL:** register a normal account through the app (`/auth/register`), then in the Supabase SQL Editor run:

```sql
update profiles
set is_gm = true, role = 'gm'
where email = 'you@example.com';
```

Reload the app — the **Game Master** section now appears in the sidebar, giving you full control: edit clans/provinces, assign players, advance the season, resolve battles and sieges, force espionage outcomes, appoint the Shogun, post announcements, and add media/lore.

---

## 3. Railway deployment

This project deploys on Railway using the included **`Dockerfile`** (Railway reads `railway.json` and builds from it automatically — no build/start commands to configure by hand).

1. Push this repository to GitHub.
2. In [Railway](https://railway.app), create a **New Project → Deploy from GitHub repo** and pick the repo. Railway detects `railway.json` and builds with the Dockerfile.
3. Add the environment variables under the service's **Variables** tab:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
   # Optional — auto-promote one account to Game Master (see below):
   GAME_MASTER_EMAIL=you@example.com
   NEXT_PUBLIC_GAME_MASTER_EMAIL=you@example.com
   ```
   Set `NEXT_PUBLIC_APP_URL` to your Railway public domain once it is generated.
4. Deploy, then watch the **Deploy Logs**. The Docker build runs `npm ci` (Node 20 + npm 11) and `next build`; the container starts with `next start -H 0.0.0.0 -p $PORT`. When it's live, open the public URL and log in.

> If Railway ever shows a stale build, use **Redeploy** and clear the build cache.

> **Note on fonts:** the app loads Cinzel and Cormorant Garamond from Google Fonts via a stylesheet `<link>` at runtime, so the build never depends on fetching fonts and won't fail in restricted build networks.

### Becoming Game Master (two ways)

**Option A — by email (recommended for Railway).** Set `GAME_MASTER_EMAIL` and `NEXT_PUBLIC_GAME_MASTER_EMAIL` to the same email, then register/log in with that email. The app promotes that account to Game Master automatically. Open `/gm` after login.

**Option B — by SQL.** Register normally, then in the Supabase SQL Editor run:
```sql
update profiles set is_gm = true, role = 'gm' where email = 'you@example.com';
```

Either way, the **Game Master** section appears in the sidebar, giving full control: edit clans/provinces, assign players, advance the season, resolve battles and sieges, force espionage outcomes, appoint the Shogun, post announcements, and add media/lore.

---

## Useful commands

```bash
npm install      # install dependencies locally
npm run dev      # local development on :3000
npm run build    # production build
npm start        # run the production build
npm run lint     # lint
```

---

## Gameplay loop (per season)

Advancing the season (GM panel → **Advance Season**) runs full turn resolution in order: province production into clan treasuries (reduced by devastation), army upkeep (starving armies lose morale), construction ticks, unit-formation ticks, army movement, battle detection and resolution for armies sharing a province, expiry of espionage visibility, and finally the calendar advances Spring → Summer → Autumn → Winter → next year. Every step writes logs and player notifications.

---

## Final validation checklist

After deploying, confirm:

- [ ] Login works (register, then sign in).
- [ ] A Game Master account exists and sees the GM panel.
- [ ] The five seeded clans appear in **Clans**.
- [ ] Provinces render on the **Map**, colored by controlling clan.
- [ ] Resource cards read **Koku / Food / Population / Horses** — no "gold".
- [ ] There are no "recruits", "materials", "weapons" or "influence" resources anywhere.
- [ ] Recruiting a unit **reduces** the source province's population.
- [ ] GM raising devastation / a siege falling **reduces** population.
- [ ] A successful ninja mission grants **temporary** visibility on the target province that expires after the configured seasons.
- [ ] Enemy provinces with no army/espionage show only vague public data (no exact troops, production or population).
- [ ] Advancing the season produces production, upkeep, logs and notifications.
- [ ] Railway deploys without errors and Supabase persists data across reloads.

---

## License

Provided as a functional, extensible base for your own campaign. Adapt freely.
