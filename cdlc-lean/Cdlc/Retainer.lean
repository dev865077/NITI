import Cdlc.ContractGrid

namespace Cdlc

variable {Scalar ContractId EdgeId Holder Outcome : Type*}
variable [DecidableEq ContractId] [DecidableEq EdgeId]

/--
Protocol-level retainer store.

This models whether a prepared bridge edge has a retained package and which
package is held. It deliberately avoids wallet storage, networking, and custody
implementation details.
-/
structure Retainer (Scalar ContractId EdgeId Holder Outcome : Type*) where
  retained : EdgeId → Prop
  packageOf : EdgeId → RetainedEdgePackage Scalar ContractId EdgeId Holder Outcome

/-- A retainer whose packages are consistent with a specific contract grid. -/
structure RetainerFor
    (grid : ContractGrid ContractId EdgeId Outcome)
    (Scalar Holder : Type*) where
  retainer : Retainer Scalar ContractId EdgeId Holder Outcome
  retained_edge_mem :
    ∀ {id : EdgeId}, retainer.retained id → id ∈ grid.edges
  package_binds :
    ∀ {id : EdgeId},
      retainer.retained id →
      (retainer.packageOf id).Binds (grid.edgeOf id)

namespace RetainerFor

def PackageAvailable
    {grid : ContractGrid ContractId EdgeId Outcome}
    (r : RetainerFor grid Scalar Holder)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  r.retainer.retained edge.id ∧ (r.retainer.packageOf edge.id).Binds edge

theorem retained_edge_in_grid
    {grid : ContractGrid ContractId EdgeId Outcome}
    (r : RetainerFor grid Scalar Holder)
    {id : EdgeId} (hRetained : r.retainer.retained id) :
    id ∈ grid.edges :=
  r.retained_edge_mem hRetained

theorem retained_package_binds
    {grid : ContractGrid ContractId EdgeId Outcome}
    (r : RetainerFor grid Scalar Holder)
    {id : EdgeId} (hRetained : r.retainer.retained id) :
    (r.retainer.packageOf id).Binds (grid.edgeOf id) :=
  r.package_binds hRetained

theorem retained_package_edge_id
    {grid : ContractGrid ContractId EdgeId Outcome}
    (r : RetainerFor grid Scalar Holder)
    {id : EdgeId} (hRetained : r.retainer.retained id) :
    (r.retainer.packageOf id).edgeId = id := by
  have hBind := r.package_binds hRetained
  have hEdgeId := grid.edge_id_consistent id (r.retained_edge_mem hRetained)
  exact hBind.1.trans hEdgeId

theorem retained_package_available_for_grid_edge
    {grid : ContractGrid ContractId EdgeId Outcome}
    (r : RetainerFor grid Scalar Holder)
    {id : EdgeId} (hRetained : r.retainer.retained id) :
    PackageAvailable r (grid.edgeOf id) := by
  have hEdgeId : (grid.edgeOf id).id = id :=
    grid.edge_id_consistent id (r.retained_edge_mem hRetained)
  constructor
  · simpa [hEdgeId] using hRetained
  · simpa [hEdgeId] using r.package_binds hRetained

end RetainerFor

/-- Synchronizes the abstract retainer store with the retained edge ids in state. -/
def StateRetainerConsistent
    (st : ProtocolState ContractId EdgeId)
    (retainer : Retainer Scalar ContractId EdgeId Holder Outcome) : Prop :=
  ∀ id : EdgeId, id ∈ st.retainedEdges ↔ retainer.retained id

theorem state_retainer_retained
    {st : ProtocolState ContractId EdgeId}
    {retainer : Retainer Scalar ContractId EdgeId Holder Outcome}
    (hSync : StateRetainerConsistent st retainer)
    {id : EdgeId} (hState : id ∈ st.retainedEdges) :
    retainer.retained id :=
  (hSync id).1 hState

theorem retainer_retained_in_state
    {st : ProtocolState ContractId EdgeId}
    {retainer : Retainer Scalar ContractId EdgeId Holder Outcome}
    (hSync : StateRetainerConsistent st retainer)
    {id : EdgeId} (hRetained : retainer.retained id) :
    id ∈ st.retainedEdges :=
  (hSync id).2 hRetained

end Cdlc
