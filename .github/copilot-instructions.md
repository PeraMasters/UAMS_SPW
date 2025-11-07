## Repo snapshot for AI code assistants

This file gives concise, actionable guidance to an AI coding assistant working in this repository (UAMS_SPW / `uams`). Keep changes minimal and explicit.

- Project type: React app bootstrapped with Create React App. Main application lives in the `uams/` folder.
- Key runtime: Node/npm. Dev start: `cd uams && npm install && npm start`.

## Big picture / architecture

- UI: React components under `uams/src/components/` grouped by feature (e.g. `exam/`, `student/`, `timetable/`). Follow the existing grouping when adding features.
- Data layer: Supabase client wrapper at `uams/src/lib/supabaseClient.js`. Network helpers live at `uams/src/lib/networkUtils.js`.
- Utilities: cross-component helpers (example: `uams/src/utils/ClashDetection.js`) — prefer reusing these utilities rather than duplicating logic.

## Important patterns and conventions (follow these exactly)

- Feature folders: place related components, CSS and small helpers together (see `uams/src/components/exam/` and `student-control/`).
- Styling: project uses plain `.css` files colocated with components (e.g. `Login.css`, `Home.css`). Keep this pattern — don't introduce CSS modules or styled-components unless agreed.
- Routing: `react-router-dom` is used; update routes in `uams/src/index.js` / `App.js` when adding top-level pages.
- External integrations: Supabase is the primary backend. Use `supabaseClient.js` to get the client instance and follow its usage style (async functions returning data and error tuples).

## Build, test and debug (exact commands)

- Install and run dev server:
  - Open a terminal, then:
    - `cd uams; npm install; npm start`
  - App will run at http://localhost:3000 (CRA default).
- Tests: `cd uams; npm test` (uses Create React App test runner).
- Build: `cd uams; npm run build`.

## Files to look at for examples

- `uams/src/lib/supabaseClient.js` — how the project initializes Supabase and performs DB/auth calls.
- `uams/src/lib/networkUtils.js` — fetch/wrapping helpers and error handling conventions.
- `uams/src/components/exam/Exam.js` — an example feature component (component structure, imports, and usage of lib utilities).
- `uams/src/components/student-control/StudentRegistrationForm.js` — an example form pattern for controlled inputs and submission flows.

## Helpful constraints for code changes

- Minimize API surface changes. Prefer adding helper functions instead of changing multiple callers.
- Keep component props small and explicit; prefer composition over passing large objects through many layers.
- Tests: if you add non-trivial logic, include a small unit test using the existing CRA test setup (see `uams/src/App.test.js` for pattern).

## What not to change without confirmation

- Do not upgrade major framework libraries (React, react-scripts, MUI) as part of routine fixes — request approval.
- Do not change routing structure or authentication flows without confirming expected user journeys.

## Example edits (phrases you can use in a PR body)

"Add feature X inside `uams/src/components/<feature>/` following existing folder patterns; reuse `uams/src/lib/supabaseClient.js` for DB operations and `uams/src/lib/networkUtils.js` for request handling. Verified locally with `cd uams && npm start`."

## If you need more info

- Inspect `uams/package.json` for installed dependencies and scripts.
- When uncertain about data model or Supabase schema, ask a human — schema and auth flows are not documented in-code.

---
Please review these lines and tell me any missing specifics (CI, secrets, infra docs) so I can iterate. 
