import Cdlc.Oracle

namespace Cdlc

/-- Minimal DLC contract surface used by the cDLC formalization. -/
structure DLCContract (Outcome : Type*) where
  funding : Type*
  cet : Outcome → Type*
  payout : Outcome → Nat

end Cdlc
