# V2 additive integration contract

This records the V2 development agreement and workstream ownership, not a supplied case fact. Read the [current HTTP/data contract](integration-contract.md) for implemented interfaces and [architecture](architecture.md) for runtime boundaries. Existing policy, session view and commands remain compatible. The local operator simulator can inspect synthetic sessions; consumer JIT endpoints require a separate scoped demo cookie. No real identity verification, communication or money movement occurs.

## Ownership

Lead: this contract, resolution-app.tsx/navigation, README, AGENTS, build log, integration contract, root scripts, integration verification and final commit.
Frontend: all other apps/web files except commercial-model.tsx and new conversation-economics files. Own api.ts adapter, SMS and JIT UI, shared CSS. Do not edit resolution-app.tsx; communicate its props/exports.
Backend: apps/api/** exclusively.
Commercial/docs: DECISION.md, output/pdf/**, docs/discovery.md, docs/architecture.md, docs/assumptions.md, docs/commercial/**, apps/web/src/components/commercial-model.tsx and new conversation-economics module/CSS only. Do not edit shared CSS or API adapter.

## Commands and added view

Existing command envelope and idempotency preserved. New commands:
- {type: "receive_sms", text: string}
- {type: "create_jit", state: JitState} for independently exploring a task
- {type: "save_draft", option_id: string} saves current preferences and immutable approved terms; no agreement
- {type: "resume_draft"} revalidates account/terms/expiry
- {type: "expire_draft"} local operator test control

`JitState` is one of: account, options, payday, draft, resume, review, payment, clarification, help, pending.

Add `conversation` to the complete session view:
```
{status: string, mode: "deterministic", last_intent: string|null,
 messages: [{id: string, direction: "inbound"|"outbound", kind: string,
 text: string, at_utc: string, status: string, template_id: string|null,
 jit_action_id: string|null}],
 decision: {intent: string, classification: string, allowed_actions: string[],
 chosen_action: string, reasons: string[], escalation_required: boolean,
 template_id: string|null}|null,
 jit_actions: [{id: string, consumer_id: string, intent: string, state: JitState,
 status: string, created_at_utc: string}],
 draft: {id: string, option_id: string, status: string, saved_at_utc: string,
 expires_at_utc: string, preferences: object}|null}
```
Any extra non-sensitive preference field is additive; confirm exact schema changes with frontend. Do not include raw magic tokens in this view/audit.

## Simulated verification

POST /sessions/:id/jit-links {action_id} -> {ok:true, token:string, action_id:string, expires_at_utc:string}. Random opaque token returned once to the local operator, hash stored server side, never audited/logged. No financial detail in this envelope.
POST /jit/verify {session_id, action_id, token} -> {ok:true, view}, with HTTP-only SameSite Strict demo cookie. Reused/expired/wrong account or action tokens rejected. Explicit demo identity-verification step before request. Phone link itself is not verified identity.
GET /jit/:session_id/:action_id -> {ok:true, view}, requires cookie scope.
POST /jit/:session_id/:action_id/commands existing command envelope -> {ok:true,view}, cookie and purpose allowlist required. JIT commands restricted to the selected task, fresh account checks retained. Token/session expiry use server time, not browser time; provide practical expiry test helper/command only in operator context, plus backend tests.

The operator UI uses existing full session views; JIT must not render account details until successful scoped verification. Independent state selection first creates a JIT descriptor and verifies it. Switching task must require a fresh scoped link. Draft is server-side ephemeral session state, lost on restart or idle expiry. Source account controls explicitly simulate authoritative human/account-service updates. Classifier never directly adds hardship/dispute holds.

## Navigation integration props

Frontend exports `SmsSimulator` and `JitPortal` components. Agree props with lead before integration. Lead keeps one shared SessionView and Act, scenarios/open/reset, plus selected JIT action ID and tab state. Consumer outcome response must refresh the shared view so the SMS thread reflects completion.
