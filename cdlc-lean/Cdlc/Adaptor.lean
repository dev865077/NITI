import Cdlc.Schnorr

namespace Cdlc

variable {Scalar Point : Type*}
variable [Ring Scalar] [AddCommGroup Point] [Module Scalar Point]

/-- Algebraic adaptor signature for a Schnorr signature. -/
structure AdaptorSig where
  Rstar : Point
  T : Point
  P : Point
  e : Scalar
  sHat : Scalar

namespace AdaptorSig

def Verifies (G : Point) (a : AdaptorSig (Scalar := Scalar) (Point := Point)) : Prop :=
  a.sHat • G = a.Rstar - a.T + a.e • a.P

def Complete (a : AdaptorSig (Scalar := Scalar) (Point := Point)) (t : Scalar) :
    SchnorrSig (Scalar := Scalar) (Point := Point) where
  R := a.Rstar
  P := a.P
  e := a.e
  s := a.sHat + t

def Extract (a : AdaptorSig (Scalar := Scalar) (Point := Point))
    (s : SchnorrSig (Scalar := Scalar) (Point := Point)) : Scalar :=
  s.s - a.sHat

/-- Constructed adaptor signatures verify before completion. -/
theorem adaptor_verifies_before_completion
    (G : Point) (r p t e : Scalar) :
    Verifies G
      { Rstar := r • G + t • G
        T := t • G
        P := p • G
        e := e
        sHat := r + e * p } := by
  simp [Verifies, add_smul, mul_smul]

/-- Adding the hidden scalar yields a valid Schnorr signature. -/
theorem completion_yields_valid_schnorr
    (G : Point) (a : AdaptorSig (Scalar := Scalar) (Point := Point))
    (t : Scalar) (hT : a.T = t • G) (ha : a.Verifies G) :
    (a.Complete t).Valid G := by
  dsimp [Complete, SchnorrSig.Valid, Verifies] at *
  calc
    (a.sHat + t) • G = a.sHat • G + t • G := by simp [add_smul]
    _ = (a.Rstar - a.T + a.e • a.P) + t • G := by rw [ha]
    _ = a.Rstar + a.e • a.P := by rw [← hT]; abel

/-- The completed Schnorr scalar reveals the hidden adaptor scalar. -/
theorem completion_reveals_hidden_scalar
    (a : AdaptorSig (Scalar := Scalar) (Point := Point)) (t : Scalar) :
    a.Extract (a.Complete t) = t := by
  simp [Extract, Complete]

theorem completed_signature_reveals_dlog
    (G : Point) (a : AdaptorSig (Scalar := Scalar) (Point := Point))
    (sig : SchnorrSig (Scalar := Scalar) (Point := Point))
    (ha : a.Verifies G) (hs : sig.Valid G) (hR : sig.R = a.Rstar)
    (hP : sig.P = a.P) (he : sig.e = a.e) :
    SolvesDLOG G a.T (a.Extract sig) := by
  dsimp [SolvesDLOG, Extract, SchnorrSig.Valid, Verifies] at *
  calc
    (sig.s - a.sHat) • G = sig.s • G - a.sHat • G := by
      simp [sub_eq_add_neg, add_smul]
    _ = (a.Rstar + a.e • a.P) - (a.Rstar - a.T + a.e • a.P) := by
      rw [hs, ha, hR, hP, he]
    _ = a.T := by abel

theorem wrong_outcome_does_not_complete
    (G : Point) [GeneratorInjective (Scalar := Scalar) G]
    (a : AdaptorSig (Scalar := Scalar) (Point := Point))
    (sx sy : Scalar) (hT : a.T = sx • G) (hNe : sy ≠ sx)
    (ha : a.Verifies G) :
    ¬ (a.Complete sy).Valid G := by
  intro hvalid
  have hDlog :
      SolvesDLOG G a.T (a.Extract (a.Complete sy)) :=
    completed_signature_reveals_dlog
      (G := G) (a := a) (sig := a.Complete sy) ha hvalid rfl rfl rfl
  have hPoint : sy • G = sx • G := by
    simpa [SolvesDLOG, Extract, Complete, hT] using hDlog
  exact hNe (scalar_eq_of_point_eq (G := G) hPoint)

end AdaptorSig

end Cdlc
