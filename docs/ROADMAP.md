# Roadmap

## Phase 0: Algebra And Harness

- Primary cDLC whitepaper.
- Lightning cDLC companion whitepaper.
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

Status: ready for final RPC and faucet configuration.

## Phase 1A: Lightning cDLC Prototype

- Extend oracle announcements with `H_pay(s_x)` commitments for finite outcomes.
- Add hold-invoice test flow for HTLC cDLC settlement.
- Model a two-party channel peer prototype where `s_x` settles the Lightning
  condition and completes the cDLC adaptor signature.
- Record test vectors for HTLC mode.
- Track PTLC support separately as a future channel upgrade path.

Status: proof model and whitepaper complete; implementation pending.

## Phase 2: Parent CET To Bridge

- Build parent funding transaction model.
- Build parent CET output reserved for a bridge.
- Build bridge transaction spending that output.
- Complete bridge witness from parent oracle attestation.
- Broadcast parent and bridge on testnet.

## Phase 3: Child DLC Funding

- Precompute child funding output from bridge transaction.
- Build child CET/refund transactions.
- Validate child funding after bridge broadcast.

## Phase 4: Multi-Party And Multi-Oracle

- Add bilateral negotiation transcript.
- Add oracle announcement schema.
- Add threshold/multi-oracle outcome attestations.
- Add fee bump and timeout policies.

## Phase 5: Auditable Prototype

- External cryptography review.
- Protocol test vectors.
- Reproducible builds.
- Minimal wallet integration.
- Public testnet demo.
