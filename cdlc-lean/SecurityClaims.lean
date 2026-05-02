import Cdlc.BridgeTransaction
import Cdlc.LazyPreparation
import Cdlc.Oracle
import Cdlc.Protocol
import Cdlc.ProtocolInventory
import Lightning.Routed

namespace CdlcSecurityClaims

open Cdlc

variable {Scalar Point Outcome : Type*}
variable [Ring Scalar] [AddCommGroup Point] [Module Scalar Point]

theorem oracle_point_correspondence
    (o : OracleEvent (Scalar := Scalar) (Point := Point) (Outcome := Outcome))
    (x : Outcome) :
    o.point x = o.scalar x • o.G :=
  OracleEvent.oracle_point_correspondence o x

theorem adaptor_verifies_before_completion
    (G : Point) (r p t e : Scalar) :
    AdaptorSig.Verifies G
      { Rstar := r • G + t • G
        T := t • G
        P := p • G
        e := e
        sHat := r + e * p } :=
  AdaptorSig.adaptor_verifies_before_completion G r p t e

theorem completion_yields_valid_schnorr
    (G : Point) (a : AdaptorSig (Scalar := Scalar) (Point := Point))
    (t : Scalar) (hT : a.T = t • G) (ha : a.Verifies G) :
    (a.Complete t).Valid G :=
  AdaptorSig.completion_yields_valid_schnorr G a t hT ha

theorem completion_reveals_hidden_scalar
    (a : AdaptorSig (Scalar := Scalar) (Point := Point)) (t : Scalar) :
    a.Extract (a.Complete t) = t :=
  AdaptorSig.completion_reveals_hidden_scalar a t

theorem wrong_outcome_does_not_complete
    (G : Point) [GeneratorInjective (Scalar := Scalar) G]
    (a : AdaptorSig (Scalar := Scalar) (Point := Point))
    (sx sy : Scalar) (hT : a.T = sx • G) (hNe : sy ≠ sx)
    (ha : a.Verifies G) :
    ¬ (a.Complete sy).Valid G :=
  AdaptorSig.wrong_outcome_does_not_complete G a sx sy hT hNe ha

theorem conditional_activation
    {parent child : DLCContract Outcome}
    (G : Point) (edge : BridgeEdge (Scalar := Scalar) (Point := Point) parent child)
    (sig : SchnorrSig (Scalar := Scalar) (Point := Point))
    (ha : edge.adaptor.Verifies G) (hs : sig.Valid G)
    (hR : sig.R = edge.adaptor.Rstar)
    (hP : sig.P = edge.adaptor.P)
    (he : sig.e = edge.adaptor.e) :
    SolvesDLOG G edge.adaptor.T (edge.adaptor.Extract sig) :=
  BridgeEdge.conditional_activation G edge sig ha hs hR hP he

theorem public_completion
    {parent child : DLCContract Outcome}
    (G : Point) (edge : BridgeEdge (Scalar := Scalar) (Point := Point) parent child)
    (sx : Scalar) (hT : edge.adaptor.T = sx • G)
    (ha : edge.adaptor.Verifies G) :
    (edge.completedSignature sx).Valid G :=
  BridgeEdge.public_completion G edge sx hT ha

theorem outcome_isolation
    {parent child : DLCContract Outcome}
    (G : Point) [GeneratorInjective (Scalar := Scalar) G]
    (edge : BridgeEdge (Scalar := Scalar) (Point := Point) parent child)
    (sx sy : Scalar) (hT : edge.adaptor.T = sx • G) (hNe : sy ≠ sx)
    (ha : edge.adaptor.Verifies G) :
    ¬ (edge.completedSignature sy).Valid G :=
  BridgeEdge.outcome_isolation G edge sx sy hT hNe ha

theorem htlc_settlement {Digest : Type*} (hash : Scalar → Digest) (sx : Scalar) :
    (Lightning.HTLC.mk hash (hash sx)).Redeems sx :=
  Lightning.HTLC.htlc_settlement hash sx

theorem htlc_outcome_isolation {Digest : Type*} (hash : Scalar → Digest)
    {sx sy : Scalar} (hNe : hash sy ≠ hash sx) :
    ¬ (Lightning.HTLC.mk hash (hash sx)).Redeems sy :=
  Lightning.HTLC.htlc_outcome_isolation hash hNe

theorem htlc_adaptor_sync {Digest : Type*}
    (G : Point) (hash : Scalar → Digest)
    (a : AdaptorSig (Scalar := Scalar) (Point := Point))
    (sx : Scalar) (hT : a.T = sx • G) (ha : a.Verifies G) :
    (Lightning.HTLC.mk hash (hash sx)).Redeems sx ∧ (a.Complete sx).Valid G :=
  Lightning.htlc_adaptor_sync G hash a sx hT ha

theorem ptlc_settlement (G : Point) (sx : Scalar) :
    (Lightning.PTLC.mk G (sx • G)).Redeems sx :=
  Lightning.PTLC.ptlc_settlement G sx

theorem ptlc_outcome_isolation (G : Point) {sx sy : Scalar}
    (hNe : sy • G ≠ sx • G) :
    ¬ (Lightning.PTLC.mk G (sx • G)).Redeems sy :=
  Lightning.PTLC.ptlc_outcome_isolation G hNe

theorem routed_htlc_atomicity {Digest : Type*} (hash : Scalar → Digest) (sx : Scalar) :
    (Lightning.HTLC.mk hash (hash sx)).Redeems sx ∧
    (Lightning.HTLC.mk hash (hash sx)).Redeems sx :=
  Lightning.routed_htlc_atomicity hash sx

theorem route_tweak_correctness (G : Point) (ti di : Scalar) :
    Lightning.routeSecret ti di • G = Lightning.routePoint G (ti • G) di :=
  Lightning.route_tweak_correctness G ti di

theorem eager_state_size (P b D : Nat) :
    eagerStateSize P b D = P * ((b ^ (D + 1) - 1) / (b - 1)) :=
  Cdlc.eager_state_size P b D

theorem lazy_state_bound (P b K D1 D2 : Nat) :
    lazyStateAtDepth P b K D1 = lazyStateAtDepth P b K D2 :=
  Cdlc.lazy_state_bound P b K D1 D2

theorem recombination_reduces_state
    {path0 path1 path2 state0 state1 state2 w0 w1 w2 : Nat}
    (h0 : state0 ≤ path0) (h1 : state1 ≤ path1) (h2 : state2 ≤ path2) :
    liveState3 state0 state1 state2 w0 w1 w2 ≤
      liveState3 path0 path1 path2 w0 w1 w2 :=
  Cdlc.recombination_reduces_state h0 h1 h2

section ProtocolLogic

variable {ContractId EdgeId Holder : Type*}
variable [DecidableEq ContractId] [DecidableEq EdgeId]

theorem active_node_materialized
    {st : ProtocolState ContractId EdgeId}
    {edgeOf : EdgeId → BridgeEdgeSpec ContractId EdgeId Outcome}
    (hWindow : WindowMaterialization st edgeOf) :
    st.active ∈ st.materialized :=
  Cdlc.active_node_materialized hWindow

theorem out_of_window_child_preparation_not_required
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    (hOut : edge.id ∉ st.liveEdges) :
    ¬ ChildPreparationRequired st edge :=
  Cdlc.out_of_window_child_preparation_not_required hOut

theorem window_materialization_prepares_live_edge
    {st : ProtocolState ContractId EdgeId}
    {edgeOf : EdgeId → BridgeEdgeSpec ContractId EdgeId Outcome}
    (hWindow : WindowMaterialization st edgeOf)
    {id : EdgeId} (hLive : id ∈ st.liveEdges)
    (hEdgeId : (edgeOf id).id = id)
    (hParent : (edgeOf id).parent = st.active)
    {adaptors : AdaptorSet Scalar} (hVerified : adaptors.verified) :
    EdgePrepared st (edgeOf id) adaptors :=
  Cdlc.window_materialization_prepares_live_edge hWindow hLive hEdgeId hParent hVerified

theorem retained_package_marks_edge_retained
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {pkg : RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome}
    (hBind : pkg.Binds edge)
    (hPkgRetained : pkg.edgeId ∈ st.retainedEdges) :
    EdgeRetained st edge :=
  Cdlc.retained_package_marks_edge_retained hBind hPkgRetained

theorem matching_outcome_activates
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome}
    (hPrepared : EdgePrepared st edge adaptors)
    (hOpen : TimeoutOpen st edge)
    (hOutcome : observed = edge.outcome) :
    BridgeActivates st edge adaptors observed adaptors.correctSecret :=
  Cdlc.matching_outcome_activates hPrepared hOpen hOutcome

theorem wrong_outcome_does_not_activate
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hWrong : observed ≠ edge.outcome) :
    ¬ BridgeActivates st edge adaptors observed secret :=
  Cdlc.wrong_outcome_does_not_activate hWrong

theorem wrong_secret_does_not_activate
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hWrong : secret ≠ adaptors.correctSecret) :
    ¬ BridgeActivates st edge adaptors observed secret :=
  Cdlc.wrong_secret_does_not_activate hWrong

theorem absent_package_does_not_activate
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hMissing : edge.id ∉ st.retainedEdges) :
    ¬ BridgeActivates st edge adaptors observed secret :=
  Cdlc.absent_package_does_not_activate hMissing

theorem expired_edge_does_not_activate
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hExpired : TimedOut st edge) :
    ¬ BridgeActivates st edge adaptors observed secret :=
  Cdlc.expired_edge_does_not_activate hExpired

theorem activation_excludes_timeout_fallback
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hAct : BridgeActivates st edge adaptors observed secret) :
    ¬ TimeoutFallback st edge :=
  Cdlc.activation_excludes_timeout_fallback hAct

theorem activation_excludes_missing_preparation_fallback
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    {observed : Outcome} {secret : Scalar}
    (hAct : BridgeActivates st edge adaptors observed secret) :
    ¬ MissingPreparationFallback st edge :=
  Cdlc.activation_excludes_missing_preparation_fallback hAct

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
    BridgeActivates st (edgeOf id) adaptors (edgeOf id).outcome adaptors.correctSecret :=
  Cdlc.prepared_edge_executable_from_window_and_package
    hWindow hLive hEdgeId hParent hVerified hOpen

theorem matching_resolution_funds_child
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {adaptors : AdaptorSet Scalar}
    (hPrepared : EdgePrepared st edge adaptors)
    (hOpen : TimeoutOpen st edge) :
    ChildFunded st edge adaptors edge.outcome adaptors.correctSecret :=
  Cdlc.matching_resolution_funds_child hPrepared hOpen

theorem retained_package_matching_resolution_funds_child
    {st : ProtocolState ContractId EdgeId}
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    {pkg : RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome}
    (hBind : pkg.Binds edge)
    (hWindowEdge : WindowMaterializesEdge st edge)
    (hPkgRetained : pkg.edgeId ∈ st.retainedEdges)
    (hVerified : pkg.adaptors.verified)
    (hOpen : TimeoutOpen st edge) :
    ChildFunded st edge pkg.adaptors edge.outcome pkg.adaptors.correctSecret :=
  Cdlc.retained_package_matching_resolution_funds_child
    hBind hWindowEdge hPkgRetained hVerified hOpen

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
      (edgeOf id).outcome pkg.adaptors.correctSecret :=
  Cdlc.window_retained_package_funds_child
    hWindow hLive hEdgeId hParent hBind hVerified hOpen

theorem contract_grid_parent_member
    (grid : ContractGrid ContractId EdgeId Outcome)
    {id : EdgeId} (hEdge : id ∈ grid.edges) :
    (grid.edgeOf id).parent ∈ grid.nodes :=
  Cdlc.inventory_contract_grid_parent_member grid hEdge

theorem contract_grid_child_member
    (grid : ContractGrid ContractId EdgeId Outcome)
    {id : EdgeId} (hEdge : id ∈ grid.edges) :
    (grid.edgeOf id).child ∈ grid.nodes :=
  Cdlc.inventory_contract_grid_child_member grid hEdge

theorem retainer_package_binds_grid_edge
    {grid : ContractGrid ContractId EdgeId Outcome}
    (retainer : RetainerFor grid Scalar Holder)
    {id : EdgeId} (hRetained : retainer.retainer.retained id) :
    (retainer.retainer.packageOf id).Binds (grid.edgeOf id) :=
  Cdlc.inventory_retainer_package_binds retainer hRetained

theorem materialized_window_live_edge_prepared
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st)
    {id : EdgeId} (hLive : id ∈ st.liveEdges)
    (hParent : (grid.edgeOf id).parent = st.active)
    {adaptors : AdaptorSet Scalar} (hVerified : adaptors.verified) :
    EdgePrepared st (grid.edgeOf id) adaptors :=
  Cdlc.inventory_window_live_edge_prepared hWindow hLive hParent hVerified

theorem materialized_window_matching_activation
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
  Cdlc.inventory_matching_activation hWindow hLive hParent hVerified hOpen

theorem complete_niti_protocol_claim
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
  Cdlc.inventory_complete_protocol_claim
    hWindow retainer hSync hLive hParent hVerified hOpen

end ProtocolLogic

end CdlcSecurityClaims
