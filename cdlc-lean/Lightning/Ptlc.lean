import Cdlc.Adaptor

namespace Lightning

variable {Scalar Point : Type*}
variable [Ring Scalar] [AddCommGroup Point] [Module Scalar Point]

structure PTLC (Scalar Point : Type*) where
  G : Point
  lock : Point

namespace PTLC

def Redeems (p : PTLC Scalar Point) (s : Scalar) : Prop :=
  s • p.G = p.lock

theorem ptlc_settlement (G : Point) (sx : Scalar) :
    (PTLC.mk G (sx • G)).Redeems sx := rfl

theorem ptlc_outcome_isolation (G : Point) {sx sy : Scalar}
    (hNe : sy • G ≠ sx • G) :
    ¬ (PTLC.mk G (sx • G)).Redeems sy := by
  exact hNe

end PTLC

end Lightning
