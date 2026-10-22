# Product UI guidelines

The interface keeps a navy, white and purple account style. The header is a symbolic two-way mark beside the name Debt Recovery Agent. Manrope is bundled locally. Its source is the [Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/manrope), and its OFL licence is included beside the font.

## Identity

- Wordmark: a 32px navy tile, an aqua bubble and a purple bubble, then the words Debt Recovery Agent.
- Navy `#000244`, action purple `#474CDE`, aqua `#75ECE2`, pale aqua `#C9F2EE` and white.
- The supplied consumer UI images use white surfaces, navy headings, purple payment actions, restrained grey separators and sans-serif type.

## Product decisions

Use this navy, white and purple identity with the clarity of a modern account/payment app. Reference patterns from [Stripe Checkout](https://stripe.com/payments/checkout), [Revolut](https://www.revolut.com/) and [Airbnb](https://www.airbnb.com/): a clear task hierarchy, familiar controls, deliberate whitespace and progressive disclosure. These are design references, not a claim to reproduce their products or an objective market ranking.

### Colour

| Token | Value | Use |
| --- | --- | --- |
| Canvas / surface | `#FFFFFF` | Default page and content |
| Secondary surface | `#F7F8FA` | Account summary, compact controls |
| Ink | `#000244` | Headings and key values |
| Body | `#343849` | Body text and labels |
| Muted | `#626779` | Supporting information, at readable contrast |
| Line | `#E7E8EE` | Structural separators and control borders |
| Action | `#474CDE` | Primary button, active selection, focus |
| Action hover | `#393DC3` | Primary interaction feedback |
| Action wash | `#F1F1FD` | Selected / contextual state |
| Aqua | `#75ECE2` | Wordmark accent and small highlights |
| Error | `#B42318` | Failed validation and blocked state |

White is the dominant surface. Purple is used for actions and selected state. Aqua is a supporting accent. No green theme, decorative gradients, tinted full-page backgrounds or marketing illustrations inside task flows.

### Typography

One family: Manrope, weights 400, 500, 600 and 700. Headings 28–32px, section headings 18–20px, body and controls 14px, supporting labels 12px. Balance values may use 36–40px with tabular numerals. No serif fonts, italic slogans, tiny tracked uppercase labels or large editorial headlines. Use sentence case.

### Layout

- A slim logo/navigation header, with the demo context clearly separated from account content.
- Consumer desktop: main task column and a compact account summary on the right. No decorative welcome sidebar.
- Mobile: account summary before the task; full-width controls and readable 14px content. Never hide required actions or account state.
- Keep primary content around 1040px wide, task forms around 480px. Use a consistent 4px spacing scale, usually 8/12/16/24/32.
- Cards are for selectable plans, actions or a discrete account summary. No nested decorative cards.

### Controls and states

HeroUI buttons, consistent 10px radii, 44px minimum touch targets and 48px form inputs. Thin neutral borders, no heavy shadows. Lucide icons at 18–20px with one consistent stroke weight. Primary actions are solid purple. Secondary actions are outlined or text. Controls must show hover, keyboard focus, disabled, loading and validation states. Status has text as well as colour.

### Copy

Lead with the task: “Choose your next step”, “Payment options”, “Review plan”. One short supporting sentence where needed. Do not repeat the same reassurance in a header, footer and helper block. Put account explanations, matching rules and fixture provenance in expandable detail. Keep explicit confirmation and simulated-payment boundaries visible at the relevant action. No invented greetings, promises, urgency, approved terms or affordability claims.

### SMS simulator and financial model

Use the same typography, brand colours and controls at higher information density. Keep state, reasons and actions visually distinct. Raw audit JSON belongs behind a disclosure. Preserve the sensitivity range and uncertainty labels in the commercial model.

## Verification

Check the real rendered UI at desktop and mobile widths. Verify keyboard focus, form labels, contrast, no horizontal overflow, no-match assistance, explicit confirmation and shared state. Test S04/S05/S06 against backend responses. Brand revisions must not introduce frontend policy decisions or change the integration contract.

## V2 task hierarchy

SMS Simulator is the main entry point. Keep consumer conversation central, local operator controls separate, and evaluated decisions available beside it. Raw audit detail remains expandable.

JIT Portal opens one relevant task after simulated verification. Explicit preferences belong in option matching; save/return preserves only an unconfirmed draft. Plan review requires explicit confirmation, and pending payment replaces further payment prompts with status. Help remains available without choosing a payment arrangement.

The operator selector exposes all twelve supplied scenarios. S04/S05/S06 are the short normal/exception walkthrough. The [product philosophy](../../docs/product-philosophy.md) explains these interaction choices and the [demo guide](../../docs/demo-guide.md) gives current steps.
