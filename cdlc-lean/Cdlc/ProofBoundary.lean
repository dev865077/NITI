namespace Cdlc

/--
The protocol proof boundary is intentionally narrow.

Lean proves the NITI protocol invariants stated over these models. Standard
cryptographic security, Bitcoin network behavior, and implementation
correspondence are represented as named external surfaces rather than silently
folded into protocol theorems.
-/
inductive ProofSurface where
  | protocolModel
  | cryptographicInterface
  | bitcoinInterface
  | implementationCorrespondence
  | operationalAssumption
deriving DecidableEq, Repr

/-- A named assumption at the boundary of the Lean protocol model. -/
structure BoundaryAssumption where
  name : String
  surface : ProofSurface
  statement : Prop

/-- A named theorem/claim proven inside the Lean protocol model. -/
structure ProvenProtocolClaim where
  name : String
  statement : Prop

/-- Protocol claims are the only claims discharged directly by this Lean layer. -/
def InLeanProtocolScope (surface : ProofSurface) : Prop :=
  surface = ProofSurface.protocolModel

theorem protocol_surface_in_scope :
    InLeanProtocolScope ProofSurface.protocolModel :=
  rfl

theorem crypto_surface_outside_protocol_scope :
    ¬ InLeanProtocolScope ProofSurface.cryptographicInterface := by
  intro h
  cases h

theorem bitcoin_surface_outside_protocol_scope :
    ¬ InLeanProtocolScope ProofSurface.bitcoinInterface := by
  intro h
  cases h

theorem implementation_surface_outside_protocol_scope :
    ¬ InLeanProtocolScope ProofSurface.implementationCorrespondence := by
  intro h
  cases h

theorem operational_surface_outside_protocol_scope :
    ¬ InLeanProtocolScope ProofSurface.operationalAssumption := by
  intro h
  cases h

end Cdlc
