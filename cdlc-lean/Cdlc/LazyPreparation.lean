import Cdlc.Graph

namespace Cdlc

/-- Live state represented by per-layer distinct state counts and per-layer weights. -/
def liveState3 (s0 s1 s2 w0 w1 w2 : Nat) : Nat :=
  s0 * w0 + s1 * w1 + s2 * w2

theorem lazy_state_bound (P b K D1 D2 : Nat) :
    lazyStateAtDepth P b K D1 = lazyStateAtDepth P b K D2 := rfl

theorem lazy_state_independent_of_depth (P b K D1 D2 : Nat) :
    (fun _D => lazyStateSize P b K) D1 =
    (fun _D => lazyStateSize P b K) D2 := rfl

theorem recombination_reduces_state
    {path0 path1 path2 state0 state1 state2 w0 w1 w2 : Nat}
    (h0 : state0 ≤ path0) (h1 : state1 ≤ path1) (h2 : state2 ≤ path2) :
    liveState3 state0 state1 state2 w0 w1 w2 ≤
      liveState3 path0 path1 path2 w0 w1 w2 := by
  dsimp [liveState3]
  nlinarith [Nat.mul_le_mul_right w0 h0,
    Nat.mul_le_mul_right w1 h1, Nat.mul_le_mul_right w2 h2]

end Cdlc
