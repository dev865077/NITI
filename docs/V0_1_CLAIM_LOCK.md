# v0.1 Claim Lock

This page freezes the public claim language for v0.1.

## Allowed Claim

NITI v0.1 demonstrates a reproducible cDLC activation path under documented
assumptions: a parent outcome reveals an oracle scalar, that scalar completes
the prepared bridge adaptor signature, the bridge funds the prepared child
path, and non-corresponding scalars do not activate that child path in the
deterministic harness.

## Short Public Form

NITI v0.1 is technical existence evidence for a Cascading DLC activation
primitive, not a production financial system.

## Required Qualifiers

Any public v0.1 statement must preserve these qualifiers:

| Area | Required qualifier |
| --- | --- |
| Network | Public signet, public testnet, dust-sized mainnet, and deterministic/regtest-equivalent evidence are technical evidence, not production readiness. |
| Custody | v0.1 is not safe for user funds. |
| Oracle | Oracle liveness, integrity, nonce discipline, and source policy remain assumptions outside the core scalar relation. |
| Fees | Fee-bump, package relay, pinning, reorg, and timeout policy are not production-proven. |
| Bilateral protocol | The bilateral layer is a deterministic prototype harness, not production transport or wallet UX. |
| Lightning | Lightning support is mathematical and harness-level, not production channel deployment. |
| Economics | Financial solvency, liquidity, collateral policy, and legal treatment are separate product work. |

## Forbidden Claims

Do not claim that v0.1:

- is mainnet-ready;
- is safe for user funds;
- is a production wallet;
- is a production oracle network;
- is a complete financial product;
- guarantees stable-value redemption;
- eliminates oracle, counterparty, fee, liquidity, collateral, legal, or
  regulatory risk;
- proves Bitcoin Core, secp256k1, SHA-256, mempool policy, wallet key
  management, Lightning production behavior, or product solvency.

## Evidence Standard

Each public technical claim must map to exactly one of these categories:

| Category | Meaning |
| --- | --- |
| Proved | A SPARK/Ada proof target checks the modeled algebra or finite model. |
| Demonstrated | A deterministic harness, regtest artifact, or public-network artifact shows the behavior. |
| Modeled | A bounded simulation checks a stated condition. |
| Assumed | The release relies on an external condition not proven by v0.1. |
| Out of scope | The release makes no claim. |

Ambiguous claims should be downgraded to "modeled", "assumed", or "out of
scope".
