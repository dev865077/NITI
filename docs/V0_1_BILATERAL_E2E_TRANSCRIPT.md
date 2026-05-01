# v0.1 Bilateral End-To-End Transcript

This transcript describes the deterministic Alice/Bob bilateral path exercised
by the Layer 3 harness.

Run:

```sh
npm run test:layer3
```

Expected result:

```text
Layer 3 bilateral artifact gate passed.
```

## Transcript

| Step | Alice/Bob action | Acceptance rule | Evidence |
| --- | --- | --- | --- |
| Role announcement | Each participant publishes public key scopes for funding, CET signing, refund, adaptor nonces, and storage identity. | Public messages contain no private scalars and key scopes are distinct. | `npm run test:bilateral-roles` |
| Setup messages | Participants exchange versioned setup messages. | Unknown critical fields, unsupported adaptor purposes, digest mismatches, and invalid acknowledgements are rejected. | `npm run test:bilateral-setup-schema` |
| Funding validation | Each side validates funding inputs, scripts, outpoints, dust, and fee reserve. | Missing counterpart funding, duplicate outpoints, wrong scripts, below-dust values, and insufficient fee reserve are rejected. | `npm run test:bilateral-funding-validation` |
| Template agreement | Both sides agree on parent CET, bridge, child funding output, refund templates, sighashes, and timelocks. | Any mutation changes the canonical template digest and is rejected. | `npm run test:bilateral-template-agreement` |
| Adaptor exchange | Each side exchanges adaptor packets for the required signing purposes. | Sender binding, signer key, sighash, adaptor point, adapted nonce, and adaptor equation must match. | `npm run test:bilateral-adaptor-exchange` |
| State retention | Each side persists the setup transcript, funding digest, template digest, oracle metadata, deadlines, and adaptor packets. | Missing adaptor state or corrupted digest aborts instead of pretending continuation is possible. | `npm run test:bilateral-state-retention` |
| Two-process execution | Alice and Bob run as separate local processes with separate storage. | Both processes reach setup acceptance with matching template digests. | `npm run test:bilateral-two-process` |
| Restart recovery | Each side reloads checkpoints after funding exchange, adaptor exchange, and oracle attestation. | Valid checkpoints resume or complete; partial state loss fails closed. | `npm run test:bilateral-restart-recovery` |
| Malformed counterparty data | The harness mutates setup and adaptor messages. | Every malformed case is rejected with a reason. | `npm run test:bilateral-malformed-counterparty` |
| Settlement execution | Oracle scalar is applied after retained-state validation. | Parent CET and bridge signatures verify for both participants. | `npm run test:bilateral-settlement-execution` |
| Wrong-path replay | The harness replays stale, reordered, swapped, or double-activation paths. | Every wrong path fails closed. | `npm run test:bilateral-wrong-path-replay` |
| Lazy holder activation | A prepared edge package is copied to Alice, Bob, and watchtower holders. | Each holder independently completes the same bridge after oracle attestation without signer secrets; wrong outcome and missing package fail closed. | `npm run test:bilateral-lazy-activation` |

## Result

The bilateral harness demonstrates that the prepared child path can be
negotiated by two independent local participants, retained, recovered, and
settled with the selected oracle scalar in the deterministic model.

It also demonstrates that malformed setup data, malformed adaptor data, missing
state, wrong scalar, wrong bridge binding, and double activation attempts fail
closed.

## Holder-Level Lazy Activation

The holder-level test exercises the compression claim most directly. It uses a
prepared edge package with kind:

```text
niti.l3.lazy_prepared_edge_package.v1
```

The generated holder evidence has kind:

```text
niti.l3_lazy_activation_holder_test.v1
```

The public Lazy bilateral bundles contain companion evidence with kind:

```text
niti.v0_2_bilateral_lazy_activation_holder_evidence.v1
```

For Alice, Bob, and the watchtower holder, the acceptance rule is:

- the holder has the prepared edge package and the later oracle attestation;
- the holder does not have signer secrets;
- the completed bridge signature verifies;
- the resulting bridge transaction id equals the broadcast bridge transaction
  id;
- the raw transaction equals the broadcast bridge raw transaction;
- the extracted adaptor secret equals the oracle attestation scalar.

The same evidence records that a wrong outcome scalar does not activate the
prepared edge, and that an unprepared or missing edge package cannot be
activated.

## Boundary

The transcript is not production wallet UX, production transport, mainnet
custody, or a public network two-party execution. It is deterministic protocol
evidence for the v0.1 research prototype. Holder-level activation is
non-interactive only after the edge package has already been negotiated,
verified, and retained.
