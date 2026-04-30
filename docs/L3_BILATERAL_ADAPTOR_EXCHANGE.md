# Layer 3 Bilateral Adaptor Exchange

This document defines the deterministic adaptor-signature exchange used by the
Layer 3 harness. It verifies that Alice and Bob independently reject malformed
counterparty adaptor signatures before setup is accepted.

## Exchange Object

Each adaptor exchange message commits to:

- the setup session id;
- the agreed transaction-template digest;
- the sending participant;
- the adaptor purpose;
- the unsigned transaction id and sighash;
- the signer role and public key;
- the adaptor point;
- the adapted nonce `R*`;
- the pre-adaptor nonce point `R`;
- the adaptor scalar `s_hat`.

The harness covers the parent CET adaptor, the parent-to-child bridge adaptor,
and the prepared child CET adaptor.

## Verification Rule

For each received adaptor signature, the participant verifies the exact
template binding and then checks the adaptor equation:

```text
s_hat G = R* - T + eP
e = H(R* || P || m)
```

The message `m` is the Taproot sighash from the agreed transaction template.
The adaptor point `T` is the oracle attestation point for the selected outcome.

## Rejection Matrix

The deterministic replay rejects:

- invalid adapted nonce;
- invalid adaptor point;
- invalid adaptor scalar;
- invalid sighash binding;
- invalid signer public-key binding;
- invalid template digest;
- invalid sender binding;
- missing adaptor signature.

Alice and Bob both verify the same exchange from their own participant views.
The public exchange object must not contain signer private keys, oracle nonce
secrets, or oracle signing keys.

## Boundary

This is a deterministic bilateral adaptor-verification harness. It does not
provide authenticated network transport, production wallet integration, nonce
backup, fee negotiation, or a complete DLC negotiation protocol. It verifies
the counterparty-message checks needed before a prepared cDLC path can move
from template agreement to accepted setup.

## Replay

Run:

```sh
npm run test:bilateral-adaptor-exchange
```

The replay emits:

```text
niti.l3_bilateral_adaptor_exchange_test.v1
```
