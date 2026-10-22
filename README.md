# InDebted product lead case study

Starter repository for the interview exercise. The supplied materials have been read and preserved in `brief/`. Product scope and the recommendation await further instructions.

## Repository

```text
apps/web/     Next.js App Router, TypeScript, Tailwind CSS
apps/api/     Elixir OTP application, Ash domain, Plug/Bandit HTTP server
brief/        Five original source files, copied without edits
docs/         Brief digest and working context
```

Read [the brief digest](docs/brief-digest.md) before choosing a solution. It separates supplied facts from open decisions. The original brief remains the source of truth.

## Run locally

Use Node.js 24, Elixir 1.19 and Erlang/OTP 28. `.nvmrc` and `.tool-versions` record the development runtimes.

Install from the repository root:

```sh
npm ci
cd apps/api
mix deps.get
cd ../..
```

In one terminal, start the API:

```sh
npm run dev:api
```

In another terminal, start Next.js:

```sh
npm run dev
```

Open <http://localhost:3000>. The API listens on <http://127.0.0.1:4000>, with `GET /health`. Next.js forwards `/api/health` to that endpoint. If port 4000 is occupied, set `API_PORT=4001` for the backend and `API_URL=http://127.0.0.1:4001` for Next.js.

## Verify

```sh
npm run lint
npm run typecheck
npm run build
npm run test:api
cd apps/api
mix format --check-formatted
```

For a production frontend smoke check, run `npm run start --workspace apps/web` after building. Start the Elixir API separately.

## Current scope

This commit provides the app structure and a health endpoint. Ash is installed and its empty `IndebtedApi.CaseStudy` domain is registered. There are no consumer resources, business rules, experiment assignments, model calls, message sends or payment actions yet. No database is required by the starter; choose persistence after agreeing the demonstration's scope.

The source CSV and JSON contain synthetic exercise data. A working product demonstration and the decision note are still to be built. The setup and digest were prepared with Codex; keep an accurate account of later AI contributions for the submission.

Framework references: [Next.js setup](https://nextjs.org/docs/app/api-reference/cli/create-next-app), [Ash getting started](https://hexdocs.pm/ash/get-started.html), [Bandit with Plug](https://hexdocs.pm/bandit/Bandit.html).

## Dependency notes

At initialization, `npm audit` reports five high-severity findings in the development-only ESLint dependency chain, rooted in `braces` through `micromatch` and `fast-glob`. The registry currently offers no patched `braces` release. npm's suggested fix downgrades `eslint-config-next` to a different Next.js major, so it has not been applied. The production dependency audit reports zero findings. Revisit the lint dependencies when a compatible patch is available.
