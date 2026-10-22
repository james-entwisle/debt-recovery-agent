# Adaptive Resolution frontend

Next.js App Router, HeroUI 3 and TypeScript. Start the Elixir API separately, then run `npm run dev` from the repository root and open http://localhost:3000. Full setup and verification commands are in the root [README](../../README.md).

The consumer portal, journey simulator and investment sensitivity calculator share one application. The portal and simulator use the same backend session, retained across tabs and page reloads in this browser tab. Reset opens a new isolated session. Backend restarts clear session state.

## Demonstrate

- **S04:** finish setting up a plan, optionally adjust payday/frequency/amount preferences within plan selection, review dates and explicitly confirm a simulated plan. The account then shows its scheduled payment, completion date, full schedule and a working support route. Use a maximum below $80 to show no-match assistance. Neither browsing nor reviewing activates a plan.
- **S05:** reset, open Journey simulator, apply the contact proposal, then advance 15 minutes. Current permissions are denied before the opt-out event is received. Advance another 15 minutes to show the delayed event.
- **S06:** repeat the simulator replay to see the pending payment suppress contact before its event arrives. Advance to the queued contact to inspect the final source-state check.

The simulator exposes original/current schedules, policy reasons, shared contact-budget checks, visible events, audit details, a stop control and a labelled message preview. Treatment/control selection creates a counterfactual preview; it does not change experimental assignment.

## Integration

`src/lib/api.ts` is the single HTTP adapter. It validates responses with Zod, exports the derived view types and sends typed commands to `/api/*`. Next.js forwards requests to `API_URL`, defaulting to `http://127.0.0.1:4000`. There are no frontend scenario decisions or live model/provider calls. Product rules and matching live in Elixir/Ash. See [the shared contract](../../docs/integration-contract.md).

All account data, plan terms, messages and effects are synthetic. This is a local demonstration without production authentication. Plan confirmation and payment controls affect only simulated state. The fixed disclosure is labelled as an exercise placeholder, not legal copy.

Run `npm run lint`, `npm run typecheck` and `npm run build` at the repository root. To smoke-test the production frontend, use `npm run start --workspace apps/web` after building.

## Visual guidelines

See [brand.md](brand.md) for the website-derived palette, typography, component and copy rules. The official InDebted SVG is bundled unchanged; Manrope is bundled locally with its OFL licence. Consumer, simulator and financial views use the same white, navy and purple system.

The demo selector intentionally exposes only S04, S05 and S06. Additional policy exceptions remain backend checks. Schedule dates come from the API and represent planned payments, not settlement history or a guaranteed payoff date. Payment-method editing is outside this local demonstration; support remains available after plan confirmation.
