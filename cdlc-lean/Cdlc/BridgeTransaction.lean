import Cdlc.Adaptor
import Cdlc.DlcContract

namespace Cdlc

variable {Scalar Point Outcome : Type*}
variable [Ring Scalar] [AddCommGroup Point] [Module Scalar Point]

/-- A prepared edge from a parent DLC outcome to a child DLC. -/
structure BridgeEdge (parent child : DLCContract Outcome) where
  outcome : Outcome
  adaptor : AdaptorSig (Scalar := Scalar) (Point := Point)

namespace BridgeEdge

def completedSignature {parent child : DLCContract Outcome}
    (e : BridgeEdge (Scalar := Scalar) (Point := Point) parent child)
    (secret : Scalar) : SchnorrSig (Scalar := Scalar) (Point := Point) :=
  e.adaptor.Complete secret

theorem public_completion {parent child : DLCContract Outcome}
    (G : Point) (edge : BridgeEdge (Scalar := Scalar) (Point := Point) parent child)
    (sx : Scalar) (hT : edge.adaptor.T = sx • G)
    (ha : edge.adaptor.Verifies G) :
    (edge.completedSignature sx).Valid G :=
  AdaptorSig.completion_yields_valid_schnorr (G := G) edge.adaptor sx hT ha

/-- Any valid completion of a verified bridge adaptor exposes a DLOG witness. -/
theorem conditional_activation {parent child : DLCContract Outcome}
    (G : Point) (edge : BridgeEdge (Scalar := Scalar) (Point := Point) parent child)
    (sig : SchnorrSig (Scalar := Scalar) (Point := Point))
    (ha : edge.adaptor.Verifies G) (hs : sig.Valid G)
    (hR : sig.R = edge.adaptor.Rstar)
    (hP : sig.P = edge.adaptor.P)
    (he : sig.e = edge.adaptor.e) :
    SolvesDLOG G edge.adaptor.T (edge.adaptor.Extract sig) :=
  AdaptorSig.completed_signature_reveals_dlog
    (G := G) (a := edge.adaptor) (sig := sig) ha hs hR hP he

theorem outcome_isolation {parent child : DLCContract Outcome}
    (G : Point) [GeneratorInjective (Scalar := Scalar) G]
    (edge : BridgeEdge (Scalar := Scalar) (Point := Point) parent child)
    (sx sy : Scalar) (hT : edge.adaptor.T = sx • G) (hNe : sy ≠ sx)
    (ha : edge.adaptor.Verifies G) :
    ¬ (edge.completedSignature sy).Valid G :=
  AdaptorSig.wrong_outcome_does_not_complete
    (G := G) edge.adaptor sx sy hT hNe ha

end BridgeEdge

end Cdlc
