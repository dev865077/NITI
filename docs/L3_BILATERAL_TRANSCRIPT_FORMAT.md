# Layer 3 Bilateral Transcript Format

This document defines the audit transcript format for a deterministic bilateral
cDLC setup session. It is a review artifact: it lets a third party check which
messages were exchanged, in which order, by which participant, and whether the
receiver accepted or rejected each critical step.

It does not define encrypted transport, peer discovery, production wallet
storage, privacy-preserving logs, or a complete two-party DLC negotiation
protocol.

## Transcript Kind

The canonical transcript kind is:

```text
niti.l3.bilateral_setup_transcript.v1
```

The transcript is built from the setup messages defined in
[`L3_BILATERAL_SETUP_SCHEMA.md`](L3_BILATERAL_SETUP_SCHEMA.md).

## Required Fields

| Field | Meaning |
| --- | --- |
| `kind` | Transcript kind. |
| `schemaVersion` | Integer schema version. |
| `sessionIdHex` | 32-byte setup session identifier shared by every message. |
| `messages` | Ordered setup messages. |
| `messageDigests` | SHA-256 digest of each canonical message. |

Every message must use the same `sessionIdHex`. Message `i` must have sequence
number `i + 1`. The transcript is invalid if message order, digest order, or
sequence order disagree.

## Canonicalization

Message digests are computed over canonical JSON:

```text
digest_i = SHA256(canonical_json(messages[i]))
```

The canonical JSON encoder sorts object keys recursively and preserves array
order. This gives stable digests across local and CI runs while still making
message order part of the transcript semantics.

## Critical Messages

A minimally reviewable bilateral setup transcript should include:

| Message kind | Audit purpose |
| --- | --- |
| `niti.l3.setup.role_announcement.v1` | Binds each participant to public role material. |
| `niti.l3.setup.oracle_event_selection.v1` | Binds the session to oracle key, nonce point, outcomes, and attestation points. |
| `niti.l3.setup.funding_inputs.v1` | Records funding inputs offered by each participant. |
| `niti.l3.setup.payout_graph.v1` | Records parent/child contract identifiers and live edges. |
| `niti.l3.setup.cet_templates.v1` | Records CET template metadata and adaptor points. |
| `niti.l3.setup.bridge_templates.v1` | Records bridge template metadata and adaptor points. |
| `niti.l3.setup.refund_templates.v1` | Records fallback paths and timelocks. |
| `niti.l3.setup.adaptor_points.v1` | Records adaptor points by purpose, event, and outcome. |
| `niti.l3.setup.ack.v1` | Records explicit acceptance of a prior message digest. |

Acknowledgements must reference a digest that appeared earlier in the same
transcript. Acknowledging a future, missing, or rewritten message is invalid.

## Validation Outcomes

The validator must reject:

- unsupported transcript kinds;
- unsupported schema versions;
- unknown message kinds;
- unknown top-level message fields;
- unknown critical fields;
- malformed hex, public key, point, amount, sequence, or role encodings;
- message digest count mismatches;
- message digest mismatches;
- repeated, missing, or reordered sequence numbers;
- messages whose `sessionIdHex` differs from the transcript session;
- acknowledgement messages that reference unknown prior digests.

These checks make the transcript useful for audit. They do not prove that a
counterparty was online, that transport was authenticated, that a wallet retained
state safely, or that the negotiated transactions confirm on Bitcoin.

## Example

```json
{
  "kind": "niti.l3.bilateral_setup_transcript.v1",
  "schemaVersion": 1,
  "sessionIdHex": "ffff2eeb3e68560e1119ababcaddcd93d905a3c7693dc6ee43a375ee5599e467",
  "messages": [
    {
      "kind": "niti.l3.setup.adaptor_points.v1",
      "schemaVersion": 1,
      "sessionIdHex": "ffff2eeb3e68560e1119ababcaddcd93d905a3c7693dc6ee43a375ee5599e467",
      "sequence": 1,
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
  ],
  "messageDigests": [
    "cd5641468cbc1a17bed0815e1ca7d5cce5557d7e50188223feb45553ac343c0e"
  ]
}
```

The committed deterministic fixture contains the full message set and validates
the digest values generated from the canonical encoder.

## Replay

```sh
npm run test:bilateral-setup-schema
```

The replay command rebuilds the canonical transcript, validates every message,
checks every digest, and exercises negative cases for malformed critical fields,
unknown fields, digest count mismatches, unsupported adaptor purposes, and
invalid acknowledgements.

## Audit Boundary

This transcript format makes bilateral setup reviewable. It does not by itself
prove bilateral signing fairness, state backup, network retry behavior,
counterparty authentication, adaptor exchange completeness, or production DLC
negotiation safety.
