import Cdlc.Algebra

namespace Cdlc

variable {Scalar Point : Type*}
variable [Ring Scalar] [AddCommGroup Point] [Module Scalar Point]

/-- Algebraic Schnorr signature model: the hash challenge is already a scalar. -/
structure SchnorrSig where
  R : Point
  P : Point
  e : Scalar
  s : Scalar

namespace SchnorrSig

def Valid (G : Point) (sig : SchnorrSig (Scalar := Scalar) (Point := Point)) : Prop :=
  sig.s • G = sig.R + sig.e • sig.P

theorem valid_ext {G : Point} {sig : SchnorrSig (Scalar := Scalar) (Point := Point)}
    (h : sig.s • G = sig.R + sig.e • sig.P) : sig.Valid G := h

end SchnorrSig

end Cdlc
