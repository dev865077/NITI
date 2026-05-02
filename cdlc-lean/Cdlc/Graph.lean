import Mathlib.Tactic

namespace Cdlc

/-- Finite directed graph edge used for protocol topology. -/
structure Edge (Node Outcome : Type*) where
  parent : Node
  outcome : Outcome
  child : Node

/-- Closed-form state count for a full non-recombining tree. -/
def eagerStateSize (P b D : Nat) : Nat :=
  P * ((b ^ (D + 1) - 1) / (b - 1))

/-- Closed-form state count for a retained lazy window. -/
def lazyStateSize (P b K : Nat) : Nat :=
  P * ((b ^ K - 1) / (b - 1))

/-- A dependent node in a bounded non-recombining tree. -/
structure BoundedNode (b D : Nat) where
  depth : Fin (D + 1)
  index : Fin (b ^ depth.val)

/-- Lazy retained state at any total depth. The depth parameter is observational. -/
def lazyStateAtDepth (P b K D : Nat) : Nat :=
  (fun _ : Nat => lazyStateSize P b K) D

theorem eager_state_size (P b D : Nat) :
    eagerStateSize P b D = P * ((b ^ (D + 1) - 1) / (b - 1)) := rfl

end Cdlc
