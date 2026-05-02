import Mathlib.Tactic

namespace Cdlc

variable {Scalar Point : Type*}

section Algebra

variable [Ring Scalar] [AddCommGroup Point] [Module Scalar Point]

/-- A scalar solves the discrete logarithm instance for a point and generator. -/
def SolvesDLOG (G : Point) (S : Point) (s : Scalar) : Prop :=
  s • G = S

/-- The modeled generator has no scalar collisions. -/
class GeneratorInjective (G : Point) : Prop where
  smul_injective : Function.Injective fun s : Scalar => s • G

lemma point_eq_of_scalar_eq (G : Point) {x y : Scalar} (h : x = y) :
    x • G = y • G := by
  simpa [h]

lemma scalar_eq_of_point_eq (G : Point) [GeneratorInjective (Scalar := Scalar) G]
    {x y : Scalar} (h : x • G = y • G) : x = y :=
  GeneratorInjective.smul_injective h

lemma point_ne_of_scalar_ne (G : Point) [GeneratorInjective (Scalar := Scalar) G]
    {x y : Scalar} (h : x ≠ y) : x • G ≠ y • G := by
  intro hp
  exact h (scalar_eq_of_point_eq (G := G) hp)

lemma sub_smul_generator (G : Point) (x y : Scalar) :
    (x - y) • G = x • G - y • G := by
  simp [sub_eq_add_neg, add_smul]

end Algebra

end Cdlc
