import Cdlc.Algebra

namespace Cdlc

variable {Scalar Point Outcome : Type*}
variable [Ring Scalar] [AddCommGroup Point] [Module Scalar Point]

/-- Oracle event data with the hash challenge for each outcome already modeled. -/
structure OracleEvent where
  G : Point
  nonce : Scalar
  secret : Scalar
  challenge : Outcome → Scalar

namespace OracleEvent

def publicKey (o : OracleEvent (Scalar := Scalar) (Point := Point) (Outcome := Outcome)) : Point :=
  o.secret • o.G

def noncePoint (o : OracleEvent (Scalar := Scalar) (Point := Point) (Outcome := Outcome)) : Point :=
  o.nonce • o.G

def scalar (o : OracleEvent (Scalar := Scalar) (Point := Point) (Outcome := Outcome))
    (x : Outcome) : Scalar :=
  o.nonce + o.challenge x * o.secret

def point (o : OracleEvent (Scalar := Scalar) (Point := Point) (Outcome := Outcome))
    (x : Outcome) : Point :=
  o.noncePoint + o.challenge x • o.publicKey

theorem oracle_point_correspondence
    (o : OracleEvent (Scalar := Scalar) (Point := Point) (Outcome := Outcome))
    (x : Outcome) :
    o.point x = o.scalar x • o.G := by
  simp [point, scalar, noncePoint, publicKey, add_smul, mul_smul]

/-- Same-event nonce discipline plus collision resistance, represented as injective outcomes. -/
class OracleNonceUniqueness
    (o : OracleEvent (Scalar := Scalar) (Point := Point) (Outcome := Outcome)) : Prop where
  scalar_injective : Function.Injective o.scalar

theorem outcome_scalar_ne_of_ne
    (o : OracleEvent (Scalar := Scalar) (Point := Point) (Outcome := Outcome))
    [OracleNonceUniqueness (Scalar := Scalar) (Point := Point) o]
    {x y : Outcome} (hxy : y ≠ x) : o.scalar y ≠ o.scalar x := by
  intro h
  exact hxy (OracleNonceUniqueness.scalar_injective h)

end OracleEvent

end Cdlc
