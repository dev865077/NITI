import Cdlc.Adaptor

namespace Lightning

variable {Scalar Digest Point : Type*}
variable [DecidableEq Digest]

structure HTLC (Scalar Digest : Type*) where
  hash : Scalar → Digest
  lock : Digest

namespace HTLC

def Redeems (h : HTLC Scalar Digest) (w : Scalar) : Prop :=
  h.hash w = h.lock

theorem htlc_settlement (hash : Scalar → Digest) (sx : Scalar) :
    (HTLC.mk hash (hash sx)).Redeems sx := rfl

theorem htlc_outcome_isolation (hash : Scalar → Digest) {sx sy : Scalar}
    (hNe : hash sy ≠ hash sx) :
    ¬ (HTLC.mk hash (hash sx)).Redeems sy := by
  exact hNe

end HTLC

variable [Ring Scalar] [AddCommGroup Point] [Module Scalar Point]

theorem htlc_adaptor_sync
    (G : Point) (hash : Scalar → Digest)
    (a : Cdlc.AdaptorSig (Scalar := Scalar) (Point := Point))
    (sx : Scalar) (hT : a.T = sx • G) (ha : a.Verifies G) :
    (HTLC.mk hash (hash sx)).Redeems sx ∧ (a.Complete sx).Valid G := by
  constructor
  · rfl
  · exact Cdlc.AdaptorSig.completion_yields_valid_schnorr
      (G := G) a sx hT ha

end Lightning
