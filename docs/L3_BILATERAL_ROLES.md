# Layer 3 Bilateral Role Fixtures

This document defines the first bilateral protocol fixture for the cDLC test
harness. Its purpose is narrow: Alice and Bob must have independent key,
nonce, refund, and storage scopes before protocol work validates funding,
exchanges adaptors, runs isolated processes, and exercises recovery behavior.

The fixture is deterministic and local. It is not a production wallet model and
must not be used with mainnet funds.

## Role Scopes

Both participants have the same private scope classes:

| Scope | Meaning | Public counterpart |
| --- | --- | --- |
| Funding key | Controls funding inputs or funding-path outputs for that participant. | Taproot address, script pubkey, internal public key, output public key. |
| CET signing key | Signs participant-specific contract execution spends. | Taproot address, script pubkey, internal public key, output public key. |
| Refund key | Signs participant-specific timeout or refund spends. | Taproot address, script pubkey, internal public key, output public key. |
| Adaptor nonce root | Local deterministic root used only to derive per-purpose adaptor nonces in the fixture. | Per-purpose nonce commitment points. |
| Storage identity | Local identity for state retention and audit namespace separation. | Storage identity public key and namespace hash. |

The private fixture material lives in
[`testnet/src/bilateral-roles.ts`](../testnet/src/bilateral-roles.ts). Public
setup messages are derived from that material and intentionally omit every
private scalar.

## Public Role Announcement

The exported public message kind is:

```text
niti.l3.bilateral_setup_message.v1
```

Each role announcement contains:

- participant role: `alice` or `bob`;
- network name;
- public funding key scope;
- public CET signing key scope;
- public refund key scope;
- adaptor nonce commitment points for `parent_cet`, `bridge`, and `child_cet`;
- storage identity public key;
- storage namespace hash.

It does not contain funding secrets, CET signing secrets, refund secrets,
adaptor nonce roots, derived adaptor nonce scalars, or storage identity
secrets.

## Independence Invariants

The local test enforces:

1. exactly two roles exist: Alice and Bob;
2. each role has five private scope classes;
3. no private scalar is reused across either participant or derived adaptor
   nonce purpose;
4. public key scopes are distinct;
5. storage identities are distinct;
6. public setup messages contain no private scalar material;
7. adaptor nonce information crosses the role boundary only as public
   commitment points;
8. Layer 3 role fixtures do not reuse the deterministic scalars from the
   single-path Layer 2 smoke harness.

These checks establish role separation only. They do not yet prove bilateral
funding validation, counterparty message validation, adaptor exchange,
two-process execution, or restart recovery.

## Reproduce

```sh
npm run test:bilateral-roles
```

The command prints a deterministic JSON fixture:

```text
niti.l3_bilateral_role_fixture.v1
```

The fixture is suitable for the next Layer 3 steps because it gives later tests
stable Alice/Bob public role announcements while keeping all private material
local to the generating participant.
