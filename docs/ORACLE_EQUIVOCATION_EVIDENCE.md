# Oracle Equivocation Evidence Format

This document defines a compact public evidence object for proving that a DLC
oracle signed two conflicting outcomes for the same event nonce.

The format is intentionally narrow. It does not define a legal dispute process,
oracle reputation system, slashing mechanism, price-source policy, or production
oracle service. It only defines what a third party needs in order to verify the
cryptographic fault.

## Evidence Kind

```text
niti.oracle.equivocation_evidence.v1
```

## Fault Condition

For a single event, an oracle should publish at most one valid attestation for
each one-time nonce. Equivocation evidence consists of two or more attestations
that satisfy all of the following:

1. They use the same oracle public key.
2. They use the same event id.
3. They use the same nonce point.
4. They verify as valid BIP340 signatures for their stated outcomes.
5. Their outcomes are mutually exclusive under the event's announced outcome
   policy.

The fifth condition is a protocol condition, not pure cryptography. The evidence
must therefore include the event outcome policy or a commitment to it.

## Required Fields

| Field | Meaning |
| --- | --- |
| `kind` | Evidence kind. |
| `schemaVersion` | Integer schema version. |
| `eventId` | Event identifier from the oracle announcement. |
| `oraclePublicXOnlyHex` | BIP340 x-only oracle public key. |
| `noncePointXOnlyHex` | Oracle nonce point used by both signatures. |
| `outcomePolicy` | Rule explaining why the listed outcomes conflict. |
| `attestations` | At least two signed outcomes. |
| `verification` | Deterministic verification checklist. |

Each attestation contains:

| Field | Meaning |
| --- | --- |
| `outcome` | Outcome string claimed by the oracle. |
| `messageHashHex` | 32-byte outcome message hash. |
| `attestationSecretHex` | Schnorr scalar `s_x`. |
| `attestationPointCompressedHex` | DLC attestation point `S_x`. |
| `bip340SignatureHex` | BIP340 signature `R_x || s_x`. |
| `observedFrom` | Public source where the attestation was observed. |

## Verification Procedure

A verifier should:

1. Check that every attestation has the same `eventId`,
   `oraclePublicXOnlyHex`, and `noncePointXOnlyHex`.
2. Check that every `bip340SignatureHex` starts with `noncePointXOnlyHex`.
3. Verify every BIP340 signature against `messageHashHex` and
   `oraclePublicXOnlyHex`.
4. Recompute the DLC attestation point:

   ```text
   e_x = H(R_o || V || messageHash_x)
   S_x = R_o + e_x V
   ```

   and check it equals `attestationPointCompressedHex`.
5. Check that the listed outcomes conflict under `outcomePolicy`.

If all checks pass, the evidence proves oracle equivocation for that event. It
does not prove which outcome was economically correct.

## Sample Evidence

The following deterministic sample uses test fixture material. It is not a
production oracle key.

```json
{
  "kind": "niti.oracle.equivocation_evidence.v1",
  "schemaVersion": 1,
  "eventId": "niti-equivocation-sample",
  "oraclePublicXOnlyHex": "466d7fcae563e5cb09a0d1870bb580344804617879a14949cf22285f1bae3f27",
  "noncePointXOnlyHex": "3c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1",
  "outcomePolicy": {
    "kind": "single-winner-outcome-set",
    "exclusiveOutcomes": [
      "BTCUSD_ABOVE_STRIKE",
      "BTCUSD_BELOW_STRIKE"
    ]
  },
  "attestations": [
    {
      "outcome": "BTCUSD_ABOVE_STRIKE",
      "messageHashHex": "68786d4937761c5baa20778c2d2cd9f49af727b2f34529c883d364133d9baaed",
      "attestationSecretHex": "76f93be0c5a8f8bdf12be7002cdb5544622711d9fd8a541bba9b375e2f2aebe4",
      "attestationPointCompressedHex": "02a09962968bf2c5262afa4c707b60e6583e381baaf3ecf631392812d38a2d27d0",
      "bip340SignatureHex": "3c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b176f93be0c5a8f8bdf12be7002cdb5544622711d9fd8a541bba9b375e2f2aebe4",
      "observedFrom": "fixture:niti-equivocation-sample:above"
    },
    {
      "outcome": "BTCUSD_BELOW_STRIKE",
      "messageHashHex": "0242ba07bf90e0a98ba3afe4c0e2323a9afbce7f61649145cde43cbaea18df51",
      "attestationSecretHex": "0ad7f3ae6b468bfd564d863d0e7da7d3a0f1bbe9791e2ee84b2faecd1360f876",
      "attestationPointCompressedHex": "023ea1c62430df96b45d9b2c94e9c0142e1cfd54f1add19a3aa30802b78a8a2997",
      "bip340SignatureHex": "3c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b10ad7f3ae6b468bfd564d863d0e7da7d3a0f1bbe9791e2ee84b2faecd1360f876",
      "observedFrom": "fixture:niti-equivocation-sample:below"
    }
  ],
  "verification": {
    "sameOraclePublicKey": true,
    "sameEventId": true,
    "sameNoncePoint": true,
    "allSignaturesVerify": true,
    "outcomesConflict": true
  }
}
```

The sample attestations can be regenerated with:

```sh
npm run --silent testnet -- oracle:attest \
  --event-id niti-equivocation-sample \
  --outcome BTCUSD_ABOVE_STRIKE \
  --oracle-secret-hex 2222222222222222222222222222222222222222222222222222222222222222 \
  --nonce-secret-hex 3333333333333333333333333333333333333333333333333333333333333333

npm run --silent testnet -- oracle:attest \
  --event-id niti-equivocation-sample \
  --outcome BTCUSD_BELOW_STRIKE \
  --oracle-secret-hex 2222222222222222222222222222222222222222222222222222222222222222 \
  --nonce-secret-hex 3333333333333333333333333333333333333333333333333333333333333333
```

## Audit Boundary

This evidence format proves a narrow cryptographic fault when conflicting
attestations are public. It does not prove price correctness, oracle source
quality, legal liability, compensation, or user recovery. If the oracle withholds
an attestation instead of equivocating, this format does not create liveness; it
only records the absence or presence of signed claims.
