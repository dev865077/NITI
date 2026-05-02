# Proof Inventory

This inventory maps the main Lean theorem names to the protocol properties they
establish.

## Top-Level Claim

| Theorem | Module | Claim |
| --- | --- | --- |
| `CdlcSecurityClaims.complete_niti_protocol_claim` | [`SecurityClaims.lean`](SecurityClaims.lean) | A materialized window, synchronized retainer, live edge, verified adaptor set, active parent, and open deadline fund the child bound to the live edge under the matching outcome. |

## Contract Grid

| Theorem | Module | Claim |
| --- | --- | --- |
| `Cdlc.ContractGrid.active_node_member` | [`Cdlc/ContractGrid.lean`](Cdlc/ContractGrid.lean) | The active contract is a member of the finite contract grid. |
| `Cdlc.ContractGrid.edge_parent_member` | [`Cdlc/ContractGrid.lean`](Cdlc/ContractGrid.lean) | Every edge in the grid references a parent node in the grid. |
| `Cdlc.ContractGrid.edge_child_member` | [`Cdlc/ContractGrid.lean`](Cdlc/ContractGrid.lean) | Every edge in the grid references a child node in the grid. |
| `Cdlc.ContractGrid.edge_in_grid_id_consistent` | [`Cdlc/ContractGrid.lean`](Cdlc/ContractGrid.lean) | Edge lookup preserves edge identity. |

## Retainer

| Theorem | Module | Claim |
| --- | --- | --- |
| `Cdlc.RetainerFor.retained_edge_in_grid` | [`Cdlc/Retainer.lean`](Cdlc/Retainer.lean) | Every retained edge belongs to the grid. |
| `Cdlc.RetainerFor.retained_package_binds` | [`Cdlc/Retainer.lean`](Cdlc/Retainer.lean) | A retained package binds to the grid edge it is stored for. |
| `Cdlc.RetainerFor.retained_package_edge_id` | [`Cdlc/Retainer.lean`](Cdlc/Retainer.lean) | A retained package preserves the retained edge id. |
| `Cdlc.state_retainer_retained` | [`Cdlc/Retainer.lean`](Cdlc/Retainer.lean) | Protocol retained-edge state implies retainer custody under synchronization. |
| `Cdlc.retainer_retained_in_state` | [`Cdlc/Retainer.lean`](Cdlc/Retainer.lean) | Retainer custody implies protocol retained-edge state under synchronization. |

## Window Materialization

| Theorem | Module | Claim |
| --- | --- | --- |
| `Cdlc.MaterializedWindow.active_grid_node` | [`Cdlc/Window.lean`](Cdlc/Window.lean) | The active state node belongs to the grid. |
| `Cdlc.MaterializedWindow.active_materialized` | [`Cdlc/Window.lean`](Cdlc/Window.lean) | The active node is materialized. |
| `Cdlc.MaterializedWindow.live_edge_in_grid` | [`Cdlc/Window.lean`](Cdlc/Window.lean) | Every live edge belongs to the grid. |
| `Cdlc.MaterializedWindow.live_edge_child_materialized` | [`Cdlc/Window.lean`](Cdlc/Window.lean) | A live edge from the active parent has its child materialized. |
| `Cdlc.MaterializedWindow.live_edge_retained` | [`Cdlc/Window.lean`](Cdlc/Window.lean) | Every live edge has retained completion state. |
| `Cdlc.MaterializedWindow.live_edge_prepared` | [`Cdlc/Window.lean`](Cdlc/Window.lean) | A live edge in a materialized window with a verified adaptor set is prepared. |

## Activation

| Theorem | Module | Claim |
| --- | --- | --- |
| `Cdlc.matching_outcome_activates` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | A prepared edge with an open deadline activates under the matching outcome and matching adaptor secret. |
| `Cdlc.prepared_edge_executable_from_window_and_package` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | Window materialization plus retained state makes the live edge executable. |
| `Cdlc.matching_resolution_funds_child` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | Matching activation funds the materialized child. |
| `Cdlc.retained_package_matching_resolution_funds_child` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | A retained package bound to an edge funds the child under matching resolution. |
| `Cdlc.materialized_window_retainer_funds_child` | [`Cdlc/ProtocolEndToEnd.lean`](Cdlc/ProtocolEndToEnd.lean) | The grid, materialized window, retainer, retained package, verified adaptor set, and open deadline compose into child funding. |

## Rejection and Fallback

| Theorem | Module | Claim |
| --- | --- | --- |
| `Cdlc.wrong_outcome_does_not_activate` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | A nonmatching observed outcome cannot activate the modeled bridge path. |
| `Cdlc.wrong_secret_does_not_activate` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | A nonmatching adaptor secret cannot activate the modeled bridge path. |
| `Cdlc.absent_package_does_not_activate` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | A missing retained package cannot activate the modeled bridge path. |
| `Cdlc.unmaterialized_child_does_not_activate` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | An unmaterialized child cannot be activated by the modeled bridge path. |
| `Cdlc.expired_edge_does_not_activate` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | An expired edge cannot activate through the normal bridge path. |
| `Cdlc.timeout_selects_fallback` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | An expired edge with a materialized parent selects timeout fallback. |
| `Cdlc.missing_retained_package_selects_fallback` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | A missing retained package selects missing-preparation fallback. |
| `Cdlc.missing_child_materialization_selects_fallback` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | A missing child materialization selects missing-preparation fallback. |
| `Cdlc.activation_excludes_timeout_fallback` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | Successful activation is disjoint from timeout fallback. |
| `Cdlc.activation_excludes_missing_preparation_fallback` | [`Cdlc/Protocol.lean`](Cdlc/Protocol.lean) | Successful activation is disjoint from missing-preparation fallback. |

## Boundary and Correspondence

| Surface | Module | Status |
| --- | --- | --- |
| Protocol proof boundary | [`Cdlc/ProofBoundary.lean`](Cdlc/ProofBoundary.lean) | Proven claims are separated from cryptographic, Bitcoin, implementation, and operational surfaces. |
| Correspondence map | [`Cdlc/Correspondence.lean`](Cdlc/Correspondence.lean) | Lean theorem names are mapped to adjacent SPARK, implementation, and evidence surfaces with explicit remaining gaps. |
| Verification gate | [`Cdlc/VerificationGate.lean`](Cdlc/VerificationGate.lean) | Build and proof-hole scan commands are represented as reproducible verification commands. |

## External Interfaces

The Lean protocol model consumes these interfaces rather than proving the full
external systems:

- `Cdlc.AdaptorSet.complete_correct`
- `Cdlc.AdaptorSet.reject_wrong`
- `Cdlc.GeneratorInjective`
- `Cdlc.OracleNonceUniqueness`
- implementation-to-model correspondence
- artifact-to-network-evidence correspondence
