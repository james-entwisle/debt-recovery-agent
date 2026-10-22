# Adaptive Resolution frontend

Next.js App Router, HeroUI 3 and TypeScript render V2's SMS Simulator, JIT Portal and Financial Model. Start the Elixir API separately, then run `npm run dev` from the repository root. The root [README](../../README.md#run-locally) owns setup and verification commands; the [demo guide](../../docs/demo-guide.md) owns walkthroughs and expected outcomes.

## Shared session and focused tasks

`src/components/resolution-app.tsx` owns tab selection, scenario/reset controls and the shared operator session. SMS opens by default and exposes all twelve supplied scenarios. Only the opaque operator session ID is retained in browser session storage. A backend restart or idle expiry loses conversation and draft state.

`src/components/sms-simulator.tsx` displays the conversation, source controls, policy decision and audit. `src/components/jit-portal.tsx` opens a descriptor from SMS or creates one through its independent task selector. It uses a separate verified view for account details and purpose-scoped requests. Switching account or task requires matching access; a simulated identity checkbox is not real identity proof. Outcomes refresh the shared view so SMS reflects the consumer's action.

`src/lib/api.ts` owns typed commands, Zod response validation and both operator/JIT requests through `/api/*`. Next.js forwards these to `API_URL`, defaulting to `http://127.0.0.1:4000`. Product eligibility, matching, terms, authentication checks and state transitions live in Elixir/Ash. The [HTTP/data contract](../../docs/integration-contract.md) describes envelopes and errors.

## Financial calculations

`commercial-model.tsx` presents the preserved backend reach/lift calculation. `conversation-economics.tsx` adds a separate responder calculation from `conversation-economics-calculation.ts`. It inherits population, mix, payer cash multiplier and investment while keeping SMS reach, response and conversational costs distinct. The independent Python companion checks saved reference cases against the actual UI calculation. See [commercial reasoning](../../docs/commercial/README.md).

## Presentation and limits

[brand.md](brand.md) contains palette, typography and copy guidance. The official InDebted SVG is bundled unchanged; Manrope is bundled locally with its OFL licence. The SMS, JIT and financial views share the white, navy and purple system.

All account data, approved options and effects are synthetic. Schedule dates come from the backend and represent planned payments, not settlement history or a guaranteed payoff date. Messages and payments are simulated; payment-method editing and production authentication are outside this demonstration. The fixed disclosure is an exercise placeholder, not approved legal copy.
