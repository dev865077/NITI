import Cdlc.ProofBoundary
import Cdlc.Retainer
import Cdlc.Window

namespace Cdlc

variable {Scalar ContractId EdgeId Holder Outcome : Type*}
variable [DecidableEq ContractId] [DecidableEq EdgeId]

/--
Complete protocol activation theorem for the modeled NITI layer.

The theorem joins the grid, materialized window, retainer, adaptor set, deadline,
and observed outcome. It says that a live edge in a materialized window whose
retained package is consistent with the retainer can fund the bound child when
the matching outcome secret is used.
-/
theorem materialized_window_retainer_funds_child
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
      (retainer.retainer.packageOf id).adaptors.correctSecret := by
  have hStateRetained : id ∈ st.retainedEdges :=
    hWindow.live_edge_retained hLive
  have hRetained : retainer.retainer.retained id :=
    state_retainer_retained hSync hStateRetained
  have hBind :
      (retainer.retainer.packageOf id).Binds (grid.edgeOf id) :=
    retainer.retained_package_binds hRetained
  exact window_retained_package_funds_child
    (hWindow := hWindow.window)
    (id := id)
    (pkg := retainer.retainer.packageOf id)
    hLive
    (hWindow.live_edge_id_consistent hLive)
    hParent
    hBind
    hVerified
    hOpen

theorem materialized_window_matching_outcome_activates
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
  prepared_edge_executable_from_window_and_package
    (hWindow := hWindow.window)
    hLive
    (hWindow.live_edge_id_consistent hLive)
    hParent
    hVerified
    hOpen

theorem materialized_window_wrong_outcome_rejected
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    {id : EdgeId}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hWrong : observed ≠ (grid.edgeOf id).outcome) :
    ¬ BridgeActivates st (grid.edgeOf id) adaptors observed secret :=
  wrong_outcome_does_not_activate hWrong

theorem materialized_window_wrong_secret_rejected
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    {id : EdgeId}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hWrong : secret ≠ adaptors.correctSecret) :
    ¬ BridgeActivates st (grid.edgeOf id) adaptors observed secret :=
  wrong_secret_does_not_activate hWrong

theorem materialized_window_missing_package_rejected
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    {id : EdgeId}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hMissing : (grid.edgeOf id).id ∉ st.retainedEdges) :
    ¬ BridgeActivates st (grid.edgeOf id) adaptors observed secret :=
  absent_package_does_not_activate hMissing

theorem materialized_window_unmaterialized_child_rejected
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    {id : EdgeId}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hMissingChild : (grid.edgeOf id).child ∉ st.materialized) :
    ¬ BridgeActivates st (grid.edgeOf id) adaptors observed secret :=
  unmaterialized_child_does_not_activate hMissingChild

theorem materialized_window_expired_edge_rejected
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    {id : EdgeId}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hExpired : TimedOut st (grid.edgeOf id)) :
    ¬ BridgeActivates st (grid.edgeOf id) adaptors observed secret :=
  expired_edge_does_not_activate hExpired

theorem materialized_window_missing_package_fallback
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    {id : EdgeId}
    (hParent : (grid.edgeOf id).parent = st.active)
    (hParentMat : (grid.edgeOf id).parent ∈ st.materialized)
    (hMissing : (grid.edgeOf id).id ∉ st.retainedEdges) :
    MissingPreparationFallback st (grid.edgeOf id) :=
  missing_retained_package_selects_fallback hParent hParentMat hMissing

theorem materialized_window_timeout_fallback
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    {id : EdgeId}
    (hParent : (grid.edgeOf id).parent = st.active)
    (hParentMat : (grid.edgeOf id).parent ∈ st.materialized)
    (hExpired : TimedOut st (grid.edgeOf id)) :
    TimeoutFallback st (grid.edgeOf id) :=
  timeout_selects_fallback hParent hParentMat hExpired

end Cdlc
