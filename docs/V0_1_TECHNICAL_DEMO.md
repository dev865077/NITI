# v0.1 Technical Demo Script

This is the historical v0.1 demo script. For the current Lazy cDLC status,
including the dust-sized Lazy mainnet artifact and compression proof boundary,
see [`LAZY_CDLC_STATUS.md`](LAZY_CDLC_STATUS.md).

This technical demo script is designed for an engineer, reviewer, or investor
diligence team that wants to see the v0.1 claim from reproducible artifacts
instead of screenshots or verbal claims.

The demo claim is intentionally narrow:

> NITI v0.1 demonstrates one public signet cDLC activation path: a parent DLC
> outcome reveals an oracle scalar, that scalar completes the parent CET and
> the bridge adaptor signature, the bridge confirms, and the bridge output
> funds the prepared child path. Wrong-outcome completion is rejected.

Do not present this demo as mainnet readiness, production custody software,
complete bilateral negotiation, a production oracle, a stablecoin, or a
solvency guarantee.

## Demo Modes

Artifact mode uses the committed public signet evidence bundle. It does not
need a live node:

```sh
npm ci
npm run demo:v0.1
```

Full local gate mode additionally runs the v0.1 verifier, including the local
deterministic harness, Ada manifest validator, and configured SPARK targets:

```sh
npm run demo:v0.1 -- --full-local-gate
```

Fresh public signet mode needs a synced Bitcoin Core signet node, RPC
credentials, and signet funds. Use
[`testnet/PUBLIC_SIGNET.md`](../testnet/PUBLIC_SIGNET.md) for that flow.

## Demo Sequence

| Step | What to show | Evidence |
| --- | --- | --- |
| 1. Proof checks | The algebraic claim is modeled and regression checked before the Bitcoin trace is discussed. | [`spark/`](../spark/), [`docs/SPARK_TO_BITCOIN_TRACE.md`](SPARK_TO_BITCOIN_TRACE.md), [v0.1 CI](V0_1_CI.md). |
| 2. Setup | The run uses a public signet parent funding output controlled by deterministic test keys. | [`public-activation-evidence-bundle.json`](evidence/public-signet/public-activation-evidence-bundle.json), funding tx [`65d17c3c...b9db2490`](https://mempool.space/signet/tx/65d17c3ccddb83733030995a7b1c59796beb4e4012b5706caa4ab6abb9db2490). |
| 3. Oracle attestation | The oracle event has an activating outcome and a wrong outcome; the activating scalar maps to the advertised attestation point. | Bundle fields `oracle.activatingOutcome`, `oracle.activatingAttestationPointCompressedHex`, `oracle.activatingAttestationSecretHex`, and `oracle.wrongOutcome`. |
| 4. Parent resolution | The parent CET spends the public parent funding output and confirms on signet. | Parent CET tx [`b6d80069...93b9838c`](https://mempool.space/signet/tx/b6d800695fa61219bdf7de10a4b97e0efae0bf974283293284aa40e893b9838c), block `302040`. |
| 5. Bridge activation | Before attestation the bridge adaptor signature is not a valid Bitcoin witness; after the scalar is revealed the bridge signature verifies and the tx confirms. | Bundle fields `bridge.adaptor.preResolutionSignatureVerifies = false`, `bridge.completion.completedSignatureVerifies = true`, bridge tx [`6b0c1951...0f8042cc`](https://mempool.space/signet/tx/6b0c1951480aa62914ed38ca3629666d4d37033b2dabf9f424ffb7450f8042cc), block `302041`. |
| 6. Child funding | The bridge creates the child funding output and the child CET/refund spends are precomputed from that output. | Bundle fields `activationPath.bridge.output`, `activationPath.childPreparedCet.input`, and `activationPath.childRefund.input`. |
| 7. Negative path | A non-corresponding oracle scalar does not activate the bridge; the early child refund is rejected as non-final. | Bundle fields `bridge.wrongScalar.rejected = true`, `checks.parentWrongOutcomeRejected = true`, `checks.bridgeWrongScalarRejected = true`, and `childRefund.earlyMempoolAccept.allowed = false`. |
| 8. Stress summary | The public signet demo proves technical activation, not economic solvency. Financial-product payoff invariants exist as separate math/SPARK models; historical stress simulation remains a Layer 5 gate. | [`docs/V0_1_ACCEPTANCE_MATRIX.md`](V0_1_ACCEPTANCE_MATRIX.md), [`research/synthetic-dollar-stable-exposure-math.md`](../research/synthetic-dollar-stable-exposure-math.md), [`spark/synthetic_dollar_stable_exposure_proofs.gpr`](../spark/synthetic_dollar_stable_exposure_proofs.gpr). |

## Artifact Demo Command

Run:

```sh
npm run demo:v0.1
```

Expected result:

- the public evidence bundle verifier passes;
- every boolean in `checks` is true;
- the script prints the parent funding tx, parent CET tx, bridge tx, and child
  funding outpoint;
- the script prints the wrong-outcome and timelock rejection evidence;
- the script ends with an explicit boundary statement.

The command is intentionally read-only for committed artifacts. It does not
broadcast a transaction and does not require private RPC credentials.

## Full-Gate Demo Command

Run:

```sh
npm run demo:v0.1 -- --full-local-gate
```

This wraps:

```sh
npm run v0.1:verify
```

Use this when the audience wants to see the local deterministic suite and proof
gate execute during the session. It can take several minutes if SPARK proof
targets are enabled and the local toolchain is cold.

## Live Public Signet Variant

For a fresh public-network run:

1. Configure `.env` for a synced Bitcoin Core signet node.
2. Generate a funding request:

   ```sh
   npm run public:cdlc-funding-request -- \
     --network signet \
     --out testnet/artifacts/public-signet-funding-request.json
   ```

3. Fund the printed signet address.
4. Execute activation:

   ```sh
   npm run public:cdlc-execute -- \
     --network signet \
     --out-dir docs/evidence/public-signet \
     --min-confirmations 1 \
     --wait-seconds 7200
   ```

5. Re-run:

   ```sh
   npm run demo:v0.1
   ```

Only use signet or testnet funds. The harness keys are deterministic test keys.

## Presenter Notes

Use this structure:

1. "First, I am not claiming production readiness. This is a technical
   existence demo on public signet."
2. "The formal object is the oracle scalar. In the parent contract it resolves
   the CET. In the bridge it is the adaptor secret."
3. "The public evidence bundle links that scalar to concrete Bitcoin
   transactions: parent funding, parent CET, bridge, and child funding."
4. "The wrong outcome is not a second valid path. The bundle records wrong
   scalar rejection."
5. "Economic products built on top still need bilateral negotiation, an
   auditable oracle, fee/reorg policy, collateral policy, and stress testing."

Avoid these lines:

- "This is mainnet ready."
- "This is a stablecoin."
- "This removes oracle risk."
- "This proves solvency."
- "Lightning integration is done."
- "Users can safely deposit funds today."

## Reviewer Checklist

1. Run `npm run demo:v0.1`.
2. Confirm the evidence verifier exits successfully.
3. Confirm all bundle checks are true.
4. Confirm the parent CET input equals the public funding outpoint.
5. Confirm the bridge input equals the parent CET output.
6. Confirm the child prepared CET and child refund both spend the bridge
   output.
7. Confirm wrong scalar rejection is recorded.
8. Confirm the demo boundary is preserved in any public communication.
