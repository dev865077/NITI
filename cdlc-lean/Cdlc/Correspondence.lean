import Cdlc.ProofBoundary

namespace Cdlc

/-- Traceability state for a Lean protocol claim. -/
inductive CorrespondenceStatus where
  | provenInLean
  | externalAssumption
  | mappedToSpark
  | mappedToImplementation
  | demonstratedByEvidence
  | remainingGap
deriving DecidableEq, Repr

/--
Traceability entry from a Lean theorem to the adjacent SPARK/code/evidence
surface. A missing adjacent surface is represented by `none`; that is an
explicit gap, not an implicit claim.
-/
structure CorrespondenceEntry where
  claimName : String
  leanSurface : String
  status : CorrespondenceStatus
  sparkSurface : Option String
  implementationSurface : Option String
  evidenceSurface : Option String
  remainingGap : Option String
deriving DecidableEq, Repr

def completeProtocolClaimEntry : CorrespondenceEntry where
  claimName := "Complete NITI protocol activation"
  leanSurface := "CdlcSecurityClaims.complete_niti_protocol_claim"
  status := CorrespondenceStatus.provenInLean
  sparkSurface := some "SPARK lazy cDLC proof targets"
  implementationSurface := some "TypeScript bounded-window activation harness"
  evidenceSurface := some "testnet/signet/mainnet evidence manifests"
  remainingGap := some "Full implementation equivalence remains a separate proof target"

def wrongPathRejectionEntry : CorrespondenceEntry where
  claimName := "Wrong path rejection"
  leanSurface := "Cdlc.materialized_window_wrong_outcome_rejected"
  status := CorrespondenceStatus.provenInLean
  sparkSurface := some "edge-local activation safety targets"
  implementationSurface := some "wrong-path and replay rejection harnesses"
  evidenceSurface := none
  remainingGap := some "Concrete artifact-to-theorem checker remains separate"

def windowMaterializationEntry : CorrespondenceEntry where
  claimName := "Window materialization"
  leanSurface := "Cdlc.MaterializedWindow"
  status := CorrespondenceStatus.provenInLean
  sparkSurface := some "finite window model and preparation predicate"
  implementationSurface := some "lazy preparation state generator"
  evidenceSurface := some "bounded-window activation manifests"
  remainingGap := some "Generator equivalence to Lean grid model remains separate"

def retainerBindingEntry : CorrespondenceEntry where
  claimName := "Retainer package binding"
  leanSurface := "Cdlc.RetainerFor.package_binds"
  status := CorrespondenceStatus.provenInLean
  sparkSurface := some "retained edge state inventory"
  implementationSurface := some "retained package manifest fields"
  evidenceSurface := none
  remainingGap := some "Manifest parser/checker remains separate"

def protocolCorrespondenceMap : List CorrespondenceEntry :=
  [ completeProtocolClaimEntry
  , wrongPathRejectionEntry
  , windowMaterializationEntry
  , retainerBindingEntry
  ]

theorem complete_protocol_claim_entry_in_map :
    completeProtocolClaimEntry ∈ protocolCorrespondenceMap := by
  unfold protocolCorrespondenceMap
  exact List.Mem.head _

theorem correspondence_map_nonempty :
    protocolCorrespondenceMap ≠ [] := by
  intro h
  have hMem : completeProtocolClaimEntry ∈ protocolCorrespondenceMap :=
    complete_protocol_claim_entry_in_map
  rw [h] at hMem
  cases hMem

end Cdlc
