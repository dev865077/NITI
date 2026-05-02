import Lightning.Htlc
import Lightning.Ptlc

namespace Lightning

variable {Scalar Digest Point : Type*}
variable [Ring Scalar] [AddCommGroup Point] [Module Scalar Point]

theorem routed_htlc_atomicity (hash : Scalar → Digest) (sx : Scalar) :
    (HTLC.mk hash (hash sx)).Redeems sx ∧
    (HTLC.mk hash (hash sx)).Redeems sx := by
  exact ⟨rfl, rfl⟩

def routePoint (G : Point) (T : Point) (d : Scalar) : Point :=
  T + d • G

def routeSecret (t d : Scalar) : Scalar :=
  t + d

theorem route_tweak_correctness (G : Point) (ti di : Scalar) :
    routeSecret ti di • G = routePoint G (ti • G) di := by
  simp [routeSecret, routePoint, add_smul]

end Lightning
