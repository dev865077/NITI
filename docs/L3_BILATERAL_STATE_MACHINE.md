# Layer 3 Bilateral State Machine

This document defines the deterministic state machine used by the Layer 3
bilateral setup harness. It is a protocol model for replay and negative tests,
not a production peer-to-peer transport or wallet implementation.

## State Sequence

The canonical setup path is:

```text
initialized
  -> roles_announced
  -> oracle_selected
  -> funding_validated
  -> payout_graph_agreed
  -> cet_templates_agreed
  -> bridge_templates_agreed
  -> refund_templates_agreed
  -> adaptor_points_exchanged
  -> setup_accepted
```

After setup acceptance, the execution states are:

```text
setup_accepted
  -> oracle_attested
  -> settled
```

The terminal non-success states are:

```text
fallback_ready
aborted
```

Once a state is terminal, no further action is accepted in the same session.
A new attempt must use a new setup session.

## Transition Rules

Role announcements must bind Alice and Bob to distinct public role material
before any oracle event is selected. Funding data is validated before payout
graphs or transaction templates are accepted. CET, bridge, and refund templates
must be retained before adaptor points are exchanged.

The key ordering invariant is:

```text
funding validation
  -> payout and template agreement
  -> adaptor point exchange
  -> bilateral setup acceptance
  -> oracle attestation
  -> settlement attempt
```

The harness rejects adaptor exchange before template agreement and rejects
settlement before setup acceptance. It also rejects any action after abort,
fallback, or settlement.

## Safety And Liveness Boundary

The state machine separates two different properties.

Cryptographic activation safety is edge-local. If a bridge adaptor is prepared
for `S_x`, only the corresponding oracle scalar `s_x` completes that adaptor
under the existing cDLC proof boundary.

Bilateral liveness is a protocol property. The state machine can require that
each party retain funding, template, refund, and adaptor state before attempting
settlement. It does not prove that a real counterparty stays online, that
transport retries succeed, or that a wallet backup policy is sufficient.

## Replay

Run:

```sh
npm run test:bilateral-state-machine
```

The replay emits:

```text
niti.l3_bilateral_state_machine_test.v1
```

The positive replay reaches `setup_accepted`, then reaches `settled` after an
oracle-attestation action and a settlement action. The negative replay rejects
adaptor exchange before templates, settlement before accepted setup, and actions
after a terminal abort.
