# Roadmap

## Phase 0: Algebra And Harness

- Primary cDLC whitepaper with Lightning extension.
- cDLC technical note.
- SPARK/Ada proof models.
- Taproot adaptor spend test harness.
- Ada manifest validator.

Status: done.

## Phase 1: Real Testnet Primitive

- Fund generated Taproot testnet address.
- Build pending adaptor spend from real UTXO.
- Complete spend using oracle attestation.
- Broadcast on testnet/signet.
- Record txid and raw transaction artifacts.

Status: done. Bitcoin Core regtest evidence exists in
[`docs/evidence/regtest-cdlc`](evidence/regtest-cdlc), and public signet
activation evidence exists in [`docs/evidence/public-signet`](evidence/public-signet).

## Phase 2: Parent CET To Bridge

- Build parent funding transaction model.
- Build parent CET output reserved for a bridge.
- Build bridge transaction spending that output.
- Complete bridge witness from parent oracle attestation.
- Record deterministic parent and bridge confirmation transcripts.

Status: done for the single-path primitive. Deterministic/regtest artifacts and
public signet/testnet Lazy artifacts are committed.

## Phase 2A: Lightning Channel Edge Prototype

- Extend oracle announcements with `H_pay(enc(s_x))` for HTLC-compatible edges.
  Initial TypeScript support exists through `lightning:oracle-lock`.
- Add hold-invoice or deferred-fulfillment test flow. Initial LND REST support
  exists through `lightning:lnd:create-hold-invoice`,
  `lightning:lnd:pay-invoice`, and `lightning:lnd:settle-invoice`.
- Add a two-party channel simulation where `enc(s_x)` settles the HTLC and
  `s_x` completes the cDLC adaptor signature. Initial offline simulation exists
  in `npm run test:lightning`.
- Track point-lock/PTLC support as a separate future channel upgrade path.

## Phase 3: Child DLC Funding

- Precompute child funding output from bridge transaction.
- Build child CET/refund transactions.
- Validate child funding after deterministic bridge confirmation.

Status: deterministic child funding, prepared child CET/refund, and parent-edge
timeout refund evidence done.

## Phase 3A: Lazy cDLC Compression

- Prove finite-window preparation requirements.
- Prove edge-local activation independence from unrelated future materialization.
- Prove window-slide and fallback selection.
- Prove non-recombining retained-state bounds.
- Prove recombining-state and per-node compression composition bounds.
- Specialize the Lazy model to BTC loan rollover.
- Demonstrate a Lazy `K = 2` path on public signet, public testnet, and
  dust-sized mainnet.

Status: done for the modeled finite claims and the single-path public evidence.
The result is live-state compression, not a production liveness guarantee. See
[`docs/LAZY_CDLC_STATUS.md`](LAZY_CDLC_STATUS.md).

## Phase 4: Multi-Party And Multi-Oracle

- Add bilateral negotiation transcript.
- Add oracle announcement schema.
- Add threshold/multi-oracle outcome attestations.
- Add Lazy window synchronization, backup, abort, and recovery policy.
- Add fee bump and timeout policies.

Status: Alice/Bob role separation fixtures exist in
[`docs/L3_BILATERAL_ROLES.md`](L3_BILATERAL_ROLES.md). Deterministic setup
message validation exists in
[`docs/L3_BILATERAL_SETUP_SCHEMA.md`](L3_BILATERAL_SETUP_SCHEMA.md). The audit
transcript format is defined in
[`docs/L3_BILATERAL_TRANSCRIPT_FORMAT.md`](L3_BILATERAL_TRANSCRIPT_FORMAT.md).
The deterministic setup state machine is defined in
[`docs/L3_BILATERAL_STATE_MACHINE.md`](L3_BILATERAL_STATE_MACHINE.md).
Deterministic transaction-template agreement is defined in
[`docs/L3_BILATERAL_TEMPLATE_AGREEMENT.md`](L3_BILATERAL_TEMPLATE_AGREEMENT.md).
Funding validation is defined in
[`docs/L3_BILATERAL_FUNDING_VALIDATION.md`](L3_BILATERAL_FUNDING_VALIDATION.md).
Deterministic adaptor-signature exchange is defined in
[`docs/L3_BILATERAL_ADAPTOR_EXCHANGE.md`](L3_BILATERAL_ADAPTOR_EXCHANGE.md).
Per-participant retained state is defined in
[`docs/L3_BILATERAL_STATE_RETENTION.md`](L3_BILATERAL_STATE_RETENTION.md).
Two-process local execution is defined in
[`docs/L3_BILATERAL_TWO_PROCESS.md`](L3_BILATERAL_TWO_PROCESS.md).

Oracle equivocation evidence is defined in
[`docs/ORACLE_EQUIVOCATION_EVIDENCE.md`](ORACLE_EQUIVOCATION_EVIDENCE.md).
The deterministic price/source/timestamp policy is defined in
[`docs/ORACLE_PRICE_SOURCE_POLICY.md`](ORACLE_PRICE_SOURCE_POLICY.md).
Announcement schema, append-only history, and oracle service operations remain
open.

## Phase 5: Auditable Prototype

- External cryptography review.
- Protocol test vectors.
- Reproducible builds.
- Minimal wallet integration.
- Public Lazy demo package.
- Historical and adversarial economic stress reports for the first product
  candidates.
