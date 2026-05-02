import Cdlc.ProtocolEndToEnd
import Cdlc.VerificationGate

namespace Cdlc

variable {Scalar ContractId EdgeId Holder Outcome : Type*}
variable [DecidableEq ContractId] [DecidableEq EdgeId]

theorem inventory_contract_grid_parent_member
    (grid : ContractGrid ContractId EdgeId Outcome)
    {id : EdgeId} (hEdge : id ∈ grid.edges) :
    (grid.edgeOf id).parent ∈ grid.nodes :=
  ContractGrid.edge_parent_member grid hEdge

theorem inventory_contract_grid_child_member
    (grid : ContractGrid ContractId EdgeId Outcome)
    {id : EdgeId} (hEdge : id ∈ grid.edges) :
    (grid.edgeOf id).child ∈ grid.nodes :=
  ContractGrid.edge_child_member grid hEdge

theorem inventory_retainer_package_binds
    {grid : ContractGrid ContractId EdgeId Outcome}
    (retainer : RetainerFor grid Scalar Holder)
    {id : EdgeId} (hRetained : retainer.retainer.retained id) :
    (retainer.retainer.packageOf id).Binds (grid.edgeOf id) :=
  retainer.retained_package_binds hRetained

theorem inventory_window_live_edge_prepared
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st)
    {id : EdgeId} (hLive : id ∈ st.liveEdges)
    (hParent : (grid.edgeOf id).parent = st.active)
    {adaptors : AdaptorSet Scalar} (hVerified : adaptors.verified) :
    EdgePrepared st (grid.edgeOf id) adaptors :=
  hWindow.live_edge_prepared hLive hParent hVerified

theorem inventory_matching_activation
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    {id : EdgeId}
    (hWindow : MaterializedWindow grid st)
    {adaptors : AdaptorSet Scalar}
    (hLive : id ∈ st.liveEdges)
    (hParent : (grid.edgeOf id).parent = st.active)
    (hVerified : adaptors.verified)
    (hOpen : TimeoutOpen st (grid.edgeOf id)) :
    BridgeActivates st (grid.edgeOf id) adaptors
      (grid.edgeOf id).outcome adaptors.correctSecret :=
  materialized_window_matching_outcome_activates
    hWindow hLive hParent hVerified hOpen

theorem inventory_wrong_outcome_rejected
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    {id : EdgeId}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hWrong : observed ≠ (grid.edgeOf id).outcome) :
    ¬ BridgeActivates st (grid.edgeOf id) adaptors observed secret :=
  materialized_window_wrong_outcome_rejected hWrong

theorem inventory_complete_protocol_claim
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    {id : EdgeId}
    (hWindow : MaterializedWindow grid st)
    (retainer : RetainerFor grid Scalar Holder)
    (hSync : StateRetainerConsistent st retainer.retainer)
    (hLive : id ∈ st.liveEdges)
    (hParent : (grid.edgeOf id).parent = st.active)
    (hVerified : (retainer.retainer.packageOf id).adaptors.verified)
    (hOpen : TimeoutOpen st (grid.edgeOf id)) :
    ChildFunded st (grid.edgeOf id)
      (retainer.retainer.packageOf id).adaptors
      (grid.edgeOf id).outcome
      (retainer.retainer.packageOf id).adaptors.correctSecret :=
  materialized_window_retainer_funds_child
    hWindow retainer hSync hLive hParent hVerified hOpen

end Cdlc
