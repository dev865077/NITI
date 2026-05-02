import Cdlc.DlcContract
import Mathlib.Data.Finset.Basic
import Mathlib.Tactic

namespace Cdlc

variable {Scalar ContractId EdgeId Holder Outcome : Type*}
variable [DecidableEq ContractId] [DecidableEq EdgeId]

/--
Proof-carrying adaptor set abstraction.

The internals of Schnorr/adaptor algebra are intentionally outside this module.
Protocol proofs use only the facts the NITI protocol needs from a retained
set: it was verified, the matching secret completes it, and a different secret
does not.
-/
structure AdaptorSet (Scalar : Type*) where
  verified : Prop
  completes : Scalar → Prop
  correctSecret : Scalar
  complete_correct : verified → completes correctSecret
  reject_wrong : ∀ {secret : Scalar}, verified → secret ≠ correctSecret → ¬ completes secret

/-- Contract node materialized by the current cDLC preparation window. -/
structure ContractNode (ContractId Outcome : Type*) where
  id : ContractId
  contract : DLCContract Outcome

/-- A bridge edge connects a parent contract outcome to a prepared child contract. -/
structure BridgeEdgeSpec (ContractId EdgeId Outcome : Type*) where
  id : EdgeId
  parent : ContractId
  child : ContractId
  outcome : Outcome
  deadline : Nat

/-- A holder's retained package for completing a previously prepared bridge edge. -/
structure RetainedEdgePackage (Scalar ContractId EdgeId Holder Outcome : Type*) where
  holder : Holder
  edgeId : EdgeId
  parent : ContractId
  child : ContractId
  outcome : Outcome
  deadline : Nat
  adaptors : AdaptorSet Scalar

namespace RetainedEdgePackage

def Binds
    (pkg : RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  pkg.edgeId = edge.id
    ∧ pkg.parent = edge.parent
    ∧ pkg.child = edge.child
    ∧ pkg.outcome = edge.outcome
    ∧ pkg.deadline = edge.deadline

theorem completes_matching_secret
    (pkg : RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome)
    (hVerified : pkg.adaptors.verified) :
    pkg.adaptors.completes pkg.adaptors.correctSecret :=
  pkg.adaptors.complete_correct hVerified

theorem rejects_wrong_secret
    (pkg : RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome)
    (hVerified : pkg.adaptors.verified)
    {secret : Scalar} (hWrong : secret ≠ pkg.adaptors.correctSecret) :
    ¬ pkg.adaptors.completes secret :=
  pkg.adaptors.reject_wrong hVerified hWrong

end RetainedEdgePackage

/-- Current protocol state for the active Lazy preparation window. -/
structure ProtocolState (ContractId EdgeId : Type*) where
  active : ContractId
  materialized : Finset ContractId
  liveEdges : Finset EdgeId
  retainedEdges : Finset EdgeId
  currentHeight : Nat

/--
Window materialization invariant.

This is the protocol-level Lazy invariant: the active node is materialized; each
live in-window edge from the active node has its child materialized; and each
live edge has retained completion state.
-/
structure WindowMaterialization
    (st : ProtocolState ContractId EdgeId)
    (edgeOf : EdgeId → BridgeEdgeSpec ContractId EdgeId Outcome) : Prop where
  active_materialized : st.active ∈ st.materialized
  live_child_materialized :
    ∀ id : EdgeId,
      id ∈ st.liveEdges →
      (edgeOf id).parent = st.active →
      (edgeOf id).child ∈ st.materialized
  live_edge_retained :
    ∀ id : EdgeId, id ∈ st.liveEdges → id ∈ st.retainedEdges

def EdgeInWindow
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  edge.id ∈ st.liveEdges ∧ edge.parent = st.active

def ChildPreparationRequired
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  EdgeInWindow st edge

def WindowMaterializesEdge
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  edge.parent = st.active
    ∧ edge.parent ∈ st.materialized
    ∧ edge.child ∈ st.materialized

def EdgeRetained
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  edge.id ∈ st.retainedEdges

def TimeoutOpen
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  st.currentHeight < edge.deadline

def TimedOut
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  edge.deadline ≤ st.currentHeight

def EdgePrepared
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome)
    (adaptors : AdaptorSet Scalar) : Prop :=
  WindowMaterializesEdge st edge ∧ EdgeRetained st edge ∧ adaptors.verified

def BridgeActivates
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome)
    (adaptors : AdaptorSet Scalar)
    (observed : Outcome)
    (secret : Scalar) : Prop :=
  EdgePrepared st edge adaptors
    ∧ TimeoutOpen st edge
    ∧ observed = edge.outcome
    ∧ adaptors.completes secret

def MissingPreparationFallback
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  edge.parent = st.active
    ∧ edge.parent ∈ st.materialized
    ∧ (edge.id ∉ st.retainedEdges ∨ edge.child ∉ st.materialized)

def TimeoutFallback
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  edge.parent = st.active ∧ edge.parent ∈ st.materialized ∧ TimedOut st edge

def ChildFunded
    (st : ProtocolState ContractId EdgeId)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome)
    (adaptors : AdaptorSet Scalar)
    (observed : Outcome)
    (secret : Scalar) : Prop :=
  BridgeActivates st edge adaptors observed secret ∧ edge.child ∈ st.materialized

theorem active_node_materialized
    {st : ProtocolState ContractId EdgeId}
    {edgeOf : EdgeId → BridgeEdgeSpec ContractId EdgeId Outcome}
    (hWindow : WindowMaterialization st edgeOf) :
    st.active ∈ st.materialized :=
  hWindow.active_materialized

theorem live_edge_child_materialized
    {st : ProtocolState ContractId EdgeId}
    {edgeOf : EdgeId → BridgeEdgeSpec ContractId EdgeId Outcome}
    (hWindow : WindowMaterialization st edgeOf)
    {id : EdgeId} (hLive : id ∈ st.liveEdges)
    (hParent : (edgeOf id).parent = st.active) :
    (edgeOf id).child ∈ st.materialized :=
  hWindow.live_child_materialized id hLive hParent

theorem live_edge_retained
    {st : ProtocolState ContractId EdgeId}
    {edgeOf : EdgeId → BridgeEdgeSpec ContractId EdgeId Outcome}
    (hWindow : WindowMaterialization st edgeOf)
    {id : EdgeId} (hLive : id ∈ st.liveEdges) :
    id ∈ st.retainedEdges :=
  hWindow.live_edge_retained id hLive

theorem out_of_window_child_preparation_not_required
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    (hOut : edge.id ∉ st.liveEdges) :
    ¬ ChildPreparationRequired st edge := by
  intro hReq
  exact hOut hReq.1

theorem window_materialization_prepares_live_edge
    {st : ProtocolState ContractId EdgeId}
    {edgeOf : EdgeId → BridgeEdgeSpec ContractId EdgeId Outcome}
    (hWindow : WindowMaterialization st edgeOf)
    {id : EdgeId} (hLive : id ∈ st.liveEdges)
    (hEdgeId : (edgeOf id).id = id)
    (hParent : (edgeOf id).parent = st.active)
    {adaptors : AdaptorSet Scalar} (hVerified : adaptors.verified) :
    EdgePrepared st (edgeOf id) adaptors := by
  constructor
  · exact ⟨hParent, by simpa [hParent] using hWindow.active_materialized,
      hWindow.live_child_materialized id hLive hParent⟩
  · exact ⟨by simpa [EdgeRetained, hEdgeId] using hWindow.live_edge_retained id hLive,
      hVerified⟩

theorem retained_package_marks_edge_retained
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {pkg : RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome}
    (hBind : pkg.Binds edge)
    (hPkgRetained : pkg.edgeId ∈ st.retainedEdges) :
    EdgeRetained st edge := by
  simpa [EdgeRetained, hBind.1] using hPkgRetained

theorem holder_can_complete_matching_secret
    {pkg : RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome}
    (hVerified : pkg.adaptors.verified) :
    pkg.adaptors.completes pkg.adaptors.correctSecret :=
  pkg.completes_matching_secret hVerified

theorem holder_rejects_wrong_secret
    {pkg : RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome}
    (hVerified : pkg.adaptors.verified)
    {secret : Scalar} (hWrong : secret ≠ pkg.adaptors.correctSecret) :
    ¬ pkg.adaptors.completes secret :=
  pkg.rejects_wrong_secret hVerified hWrong

theorem matching_outcome_activates
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome}
    (hPrepared : EdgePrepared st edge adaptors)
    (hOpen : TimeoutOpen st edge)
    (hOutcome : observed = edge.outcome) :
    BridgeActivates st edge adaptors observed adaptors.correctSecret := by
  exact ⟨hPrepared, hOpen, hOutcome, adaptors.complete_correct hPrepared.2.2⟩

theorem wrong_outcome_does_not_activate
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hWrong : observed ≠ edge.outcome) :
    ¬ BridgeActivates st edge adaptors observed secret := by
  intro hAct
  exact hWrong hAct.2.2.1

theorem wrong_secret_does_not_activate
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hWrong : secret ≠ adaptors.correctSecret) :
    ¬ BridgeActivates st edge adaptors observed secret := by
  intro hAct
  exact adaptors.reject_wrong hAct.1.2.2 hWrong hAct.2.2.2

theorem absent_package_does_not_activate
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hMissing : edge.id ∉ st.retainedEdges) :
    ¬ BridgeActivates st edge adaptors observed secret := by
  intro hAct
  exact hMissing hAct.1.2.1

theorem unmaterialized_child_does_not_activate
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hMissingChild : edge.child ∉ st.materialized) :
    ¬ BridgeActivates st edge adaptors observed secret := by
  intro hAct
  exact hMissingChild hAct.1.1.2.2

theorem expired_edge_does_not_activate
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hExpired : TimedOut st edge) :
    ¬ BridgeActivates st edge adaptors observed secret := by
  intro hAct
  exact (not_lt_of_ge hExpired) hAct.2.1

theorem timeout_selects_fallback
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    (hParent : edge.parent = st.active)
    (hParentMat : edge.parent ∈ st.materialized)
    (hExpired : TimedOut st edge) :
    TimeoutFallback st edge := by
  exact ⟨hParent, hParentMat, hExpired⟩

theorem missing_retained_package_selects_fallback
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    (hParent : edge.parent = st.active)
    (hParentMat : edge.parent ∈ st.materialized)
    (hMissing : edge.id ∉ st.retainedEdges) :
    MissingPreparationFallback st edge := by
  exact ⟨hParent, hParentMat, Or.inl hMissing⟩

theorem missing_child_materialization_selects_fallback
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    (hParent : edge.parent = st.active)
    (hParentMat : edge.parent ∈ st.materialized)
    (hMissingChild : edge.child ∉ st.materialized) :
    MissingPreparationFallback st edge := by
  exact ⟨hParent, hParentMat, Or.inr hMissingChild⟩

theorem activation_excludes_timeout_fallback
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hAct : BridgeActivates st edge adaptors observed secret) :
    ¬ TimeoutFallback st edge := by
  intro hFallback
  exact (not_lt_of_ge hFallback.2.2) hAct.2.1

theorem activation_excludes_missing_preparation_fallback
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hAct : BridgeActivates st edge adaptors observed secret) :
    ¬ MissingPreparationFallback st edge := by
  intro hFallback
  cases hFallback.2.2 with
  | inl hMissing =>
      exact hMissing hAct.1.2.1
  | inr hMissingChild =>
      exact hMissingChild hAct.1.1.2.2

theorem prepared_edge_executable_from_window_and_package
    {st : ProtocolState ContractId EdgeId}
    {edgeOf : EdgeId → BridgeEdgeSpec ContractId EdgeId Outcome}
    {id : EdgeId}
    {adaptors : AdaptorSet Scalar}
    (hWindow : WindowMaterialization st edgeOf)
    (hLive : id ∈ st.liveEdges)
    (hEdgeId : (edgeOf id).id = id)
    (hParent : (edgeOf id).parent = st.active)
    (hVerified : adaptors.verified)
    (hOpen : TimeoutOpen st (edgeOf id)) :
    BridgeActivates st (edgeOf id) adaptors (edgeOf id).outcome adaptors.correctSecret := by
  exact matching_outcome_activates
    (window_materialization_prepares_live_edge
      (hWindow := hWindow) hLive hEdgeId hParent hVerified)
    hOpen rfl

theorem matching_resolution_funds_child
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    (hPrepared : EdgePrepared st edge adaptors)
    (hOpen : TimeoutOpen st edge) :
    ChildFunded st edge adaptors edge.outcome adaptors.correctSecret := by
  have hAct := matching_outcome_activates
    (st := st) (edge := edge) (adaptors := adaptors)
    (observed := edge.outcome) hPrepared hOpen rfl
  exact ⟨hAct, hPrepared.1.2.2⟩

theorem retained_package_matching_resolution_funds_child
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {pkg : RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome}
    (hBind : pkg.Binds edge)
    (hWindowEdge : WindowMaterializesEdge st edge)
    (hPkgRetained : pkg.edgeId ∈ st.retainedEdges)
    (hVerified : pkg.adaptors.verified)
    (hOpen : TimeoutOpen st edge) :
    ChildFunded st edge pkg.adaptors edge.outcome pkg.adaptors.correctSecret := by
  have hPrepared : EdgePrepared st edge pkg.adaptors :=
    ⟨hWindowEdge, retained_package_marks_edge_retained
      (st := st) (edge := edge) (pkg := pkg) hBind hPkgRetained, hVerified⟩
  exact matching_resolution_funds_child hPrepared hOpen

theorem window_retained_package_funds_child
    {st : ProtocolState ContractId EdgeId}
    {edgeOf : EdgeId → BridgeEdgeSpec ContractId EdgeId Outcome}
    {id : EdgeId}
    {pkg : RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome}
    (hWindow : WindowMaterialization st edgeOf)
    (hLive : id ∈ st.liveEdges)
    (hEdgeId : (edgeOf id).id = id)
    (hParent : (edgeOf id).parent = st.active)
    (hBind : pkg.Binds (edgeOf id))
    (hVerified : pkg.adaptors.verified)
    (hOpen : TimeoutOpen st (edgeOf id)) :
    ChildFunded st (edgeOf id) pkg.adaptors
      (edgeOf id).outcome pkg.adaptors.correctSecret := by
  have hWindowEdge : WindowMaterializesEdge st (edgeOf id) :=
    ⟨hParent, by simpa [hParent] using hWindow.active_materialized,
      hWindow.live_child_materialized id hLive hParent⟩
  have hPkgRetained : pkg.edgeId ∈ st.retainedEdges := by
    simpa [hBind.1, hEdgeId] using hWindow.live_edge_retained id hLive
  exact retained_package_matching_resolution_funds_child
    hBind hWindowEdge hPkgRetained hVerified hOpen

end Cdlc
