# Layer 3 Two-Process Harness

This document defines the deterministic two-process Layer 3 harness. It checks
that Alice and Bob can validate setup through explicit message transport while
running as separate local processes with separate storage directories.

## Process Boundary

The harness starts one Alice process and one Bob process. Each process has:

- its own process id;
- its own storage directory;
- its own received-message log;
- its own process log;
- its own result file.

The parent test process acts only as a deterministic local transport. It sends
setup messages and the adaptor exchange as JSON lines over each peer's stdin
and records the same command stream in a transport log.

## Peer Validation

Each peer independently validates:

- setup transcript schema and message digests;
- setup state-machine completion;
- funding validation;
- transaction-template digest;
- adaptor-signature exchange.

The setup is accepted only when both peers independently reach
`setup_accepted`.

## Boundary

This is not a remote networking protocol. It does not implement encrypted
transport, authentication, retries, peer discovery, or production wallet UX. It
does demonstrate that the local Layer 3 checks are not a single in-memory
function call that silently computes both participant views.

## Replay

Run:

```sh
npm run test:bilateral-two-process
```

The replay emits:

```text
niti.l3_bilateral_two_process_test.v1
```
