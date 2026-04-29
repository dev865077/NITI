# Layer 3 Bilateral Setup Schema

This document defines the deterministic setup message schema used before any
participant signs cDLC transactions. It sits above the role fixture layer:
Alice and Bob first expose public role material, then exchange setup messages
that describe the contract graph, transaction templates, adaptor points, and
acknowledgements.

The schema is local and deterministic. It does not define encrypted transport,
production wallet storage, network retry policy, or user-facing negotiation UX.

## Envelope

Every setup message has these common fields:

| Field | Meaning |
| --- | --- |
| `kind` | Versioned message kind. |
| `schemaVersion` | Integer schema version, currently `1`. |
| `sessionIdHex` | 32-byte deterministic session identifier. |
| `sequence` | Positive integer message order. |
| `sender` | `alice` or `bob`. |
| `criticalFields` | Field names that the receiver must understand. |

The validator rejects:

- unsupported message kinds;
- wrong schema versions;
- non-deterministic or malformed field encodings;
- unknown top-level fields;
- any `criticalFields` entry that is not a known field for that message kind;
- transcript digest mismatches.

## Message Kinds

| Kind | Purpose |
| --- | --- |
| `niti.l3.setup.role_announcement.v1` | Carries the public role announcement from the Alice/Bob role fixture. |
| `niti.l3.setup.oracle_event_selection.v1` | Selects oracle event id, oracle public key, nonce point, outcomes, and attestation points. |
| `niti.l3.setup.funding_inputs.v1` | Lists participant funding inputs by owner, outpoint, value, and script. |
| `niti.l3.setup.payout_graph.v1` | Defines parent contract, child contract, activating outcome, non-activating outcome, and graph edge. |
| `niti.l3.setup.cet_templates.v1` | Defines CET template metadata: contract id, outcome, signer, input/output roles, fee, and adaptor point. |
| `niti.l3.setup.bridge_templates.v1` | Defines bridge template metadata: parent, child, activating outcome, edge output, signer, fee, and adaptor point. |
| `niti.l3.setup.refund_templates.v1` | Defines refund template metadata: spend target, signer, locktime, sequence, and fee. |
| `niti.l3.setup.adaptor_points.v1` | Lists adaptor points used for parent CET, bridge, and child CET conditions. |
| `niti.l3.setup.ack.v1` | Acknowledges a prior message digest as accepted. |

The TypeScript schema and validator live in
[`testnet/src/bilateral-setup-schema.ts`](../testnet/src/bilateral-setup-schema.ts).

## Example Message

```json
{
  "kind": "niti.l3.setup.adaptor_points.v1",
  "schemaVersion": 1,
  "sessionIdHex": "ffff2eeb3e68560e1119ababcaddcd93d905a3c7693dc6ee43a375ee5599e467",
  "sequence": 9,
  "sender": "alice",
  "criticalFields": [],
  "points": [
    {
      "purpose": "bridge",
      "eventId": "niti-v0.1-parent-cdlc-smoke",
      "outcome": "BTCUSD_ABOVE_STRIKE",
      "pointCompressedHex": "03a9853a7527b53165a23208738656cb6337d734297173e4939e1d6420f31a1124"
    }
  ]
}
```

The `purpose` value is constrained to the known adaptor purposes:
`parent_cet`, `bridge`, or `child_cet`. A receiver must reject unsupported
purposes instead of treating them as opaque extension strings.

## Deterministic Transcript

The canonical transcript kind is:

```text
niti.l3.bilateral_setup_transcript.v1
```

It contains:

- `schemaVersion`;
- `sessionIdHex`;
- ordered setup messages;
- one SHA-256 digest per canonicalized message.

The canonical JSON encoder sorts object keys recursively and preserves array
order. Message digests are computed over that canonical JSON representation.
This makes the fixture stable across local and CI runs.

## Reproduce

```sh
npm run test:bilateral-setup-schema
```

The command verifies that:

1. all required message kinds are represented;
2. message digests match the canonicalized messages;
3. rebuilding the transcript produces identical canonical JSON;
4. unknown critical fields are rejected;
5. unknown top-level fields are rejected;
6. transcript digest count mismatches are rejected.
7. unsupported adaptor purposes are rejected;
8. acknowledgements must point to a prior message digest.

This establishes a setup-message contract for the next Layer 3 work: funding
input validation, bilateral adaptor exchange, state retention, process
isolation, and restart recovery.
