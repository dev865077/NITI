import Cdlc.Correspondence

namespace Cdlc

/-- Reproducible local command used by the Lean protocol verification gate. -/
structure VerificationCommand where
  name : String
  command : String
deriving DecidableEq, Repr

def leanBuildCommand : VerificationCommand where
  name := "Lean build"
  command := "~/.elan/bin/lake build"

def proofHoleScanCommand : VerificationCommand where
  name := "No proof-hole scan"
  command := "rg -n '\\bsorry\\b|\\badmit\\b|\\baxiom\\b|\\bunsafe\\b' cdlc-lean -g '*.lean'"

def protocolVerificationGate : List VerificationCommand :=
  [leanBuildCommand, proofHoleScanCommand]

theorem lean_build_command_in_gate :
    leanBuildCommand ∈ protocolVerificationGate := by
  unfold protocolVerificationGate
  exact List.Mem.head _

theorem proof_hole_scan_command_in_gate :
    proofHoleScanCommand ∈ protocolVerificationGate := by
  unfold protocolVerificationGate
  exact List.Mem.tail _ (List.Mem.head _)

/-- Inventory entry for a proved protocol theorem. -/
structure ProtocolInventoryEntry where
  claimName : String
  theoremName : String
  surface : ProofSurface
deriving DecidableEq, Repr

def completeProtocolInventoryEntry : ProtocolInventoryEntry where
  claimName := "Materialized live edge with retained package funds the bound child"
  theoremName := "CdlcSecurityClaims.complete_niti_protocol_claim"
  surface := ProofSurface.protocolModel

def activationRejectionInventoryEntry : ProtocolInventoryEntry where
  claimName := "Invalid activation paths are rejected"
  theoremName := "Cdlc.materialized_window_wrong_outcome_rejected"
  surface := ProofSurface.protocolModel

def timeoutFallbackInventoryEntry : ProtocolInventoryEntry where
  claimName := "Expired edge selects timeout fallback instead of activation"
  theoremName := "Cdlc.materialized_window_timeout_fallback"
  surface := ProofSurface.protocolModel

def protocolProofInventory : List ProtocolInventoryEntry :=
  [ completeProtocolInventoryEntry
  , activationRejectionInventoryEntry
  , timeoutFallbackInventoryEntry
  ]

theorem complete_protocol_inventory_entry_in_inventory :
    completeProtocolInventoryEntry ∈ protocolProofInventory := by
  unfold protocolProofInventory
  exact List.Mem.head _

theorem every_inventory_entry_is_protocol_surface :
    ∀ entry, entry ∈ protocolProofInventory → InLeanProtocolScope entry.surface := by
  intro entry hEntry
  unfold protocolProofInventory at hEntry
  cases hEntry with
  | head =>
    exact protocol_surface_in_scope
  | tail _ hTail =>
      cases hTail with
      | head =>
          exact protocol_surface_in_scope
      | tail _ hTail2 =>
          cases hTail2 with
          | head =>
              exact protocol_surface_in_scope
          | tail _ hNil =>
              cases hNil

end Cdlc
