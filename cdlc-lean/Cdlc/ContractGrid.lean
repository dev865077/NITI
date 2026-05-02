import Cdlc.Protocol

namespace Cdlc

variable {ContractId EdgeId Outcome : Type*}
variable [DecidableEq ContractId] [DecidableEq EdgeId]

/--
Finite NITI contract grid.

The grid records the protocol topology only: which contract nodes exist, which
bridge edges exist, and how each edge binds parent, outcome, child, and
deadline.
-/
structure ContractGrid (ContractId EdgeId Outcome : Type*)
    [DecidableEq ContractId] [DecidableEq EdgeId] where
  nodes : Finset ContractId
  edges : Finset EdgeId
  active : ContractId
  nodeOf : ContractId → ContractNode ContractId Outcome
  edgeOf : EdgeId → BridgeEdgeSpec ContractId EdgeId Outcome
  node_id_consistent :
    ∀ id : ContractId, id ∈ nodes → (nodeOf id).id = id
  edge_id_consistent :
    ∀ id : EdgeId, id ∈ edges → (edgeOf id).id = id
  edge_parent_mem :
    ∀ id : EdgeId, id ∈ edges → (edgeOf id).parent ∈ nodes
  edge_child_mem :
    ∀ id : EdgeId, id ∈ edges → (edgeOf id).child ∈ nodes
  active_mem : active ∈ nodes

namespace ContractGrid

def NodeInGrid
    (grid : ContractGrid ContractId EdgeId Outcome)
    (node : ContractNode ContractId Outcome) : Prop :=
  node.id ∈ grid.nodes ∧ grid.nodeOf node.id = node

def EdgeInGrid
    (grid : ContractGrid ContractId EdgeId Outcome)
    (edge : BridgeEdgeSpec ContractId EdgeId Outcome) : Prop :=
  edge.id ∈ grid.edges ∧ grid.edgeOf edge.id = edge

theorem active_node_member
    (grid : ContractGrid ContractId EdgeId Outcome) :
    grid.active ∈ grid.nodes :=
  grid.active_mem

theorem node_id
    (grid : ContractGrid ContractId EdgeId Outcome)
    {id : ContractId} (hNode : id ∈ grid.nodes) :
    (grid.nodeOf id).id = id :=
  grid.node_id_consistent id hNode

theorem edge_id
    (grid : ContractGrid ContractId EdgeId Outcome)
    {id : EdgeId} (hEdge : id ∈ grid.edges) :
    (grid.edgeOf id).id = id :=
  grid.edge_id_consistent id hEdge

theorem edge_parent_member
    (grid : ContractGrid ContractId EdgeId Outcome)
    {id : EdgeId} (hEdge : id ∈ grid.edges) :
    (grid.edgeOf id).parent ∈ grid.nodes :=
  grid.edge_parent_mem id hEdge

theorem edge_child_member
    (grid : ContractGrid ContractId EdgeId Outcome)
    {id : EdgeId} (hEdge : id ∈ grid.edges) :
    (grid.edgeOf id).child ∈ grid.nodes :=
  grid.edge_child_mem id hEdge

theorem edge_in_grid_self
    (grid : ContractGrid ContractId EdgeId Outcome)
    {id : EdgeId} (hEdge : id ∈ grid.edges) :
    EdgeInGrid grid (grid.edgeOf id) := by
  have hId : (grid.edgeOf id).id = id := grid.edge_id_consistent id hEdge
  constructor
  · simpa [hId] using hEdge
  · simp [hId]

theorem edge_in_grid_parent_member
    (grid : ContractGrid ContractId EdgeId Outcome)
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    (hEdge : EdgeInGrid grid edge) :
    edge.parent ∈ grid.nodes := by
  rcases hEdge with ⟨hMem, hEq⟩
  rw [← hEq]
  exact grid.edge_parent_mem edge.id hMem

theorem edge_in_grid_child_member
    (grid : ContractGrid ContractId EdgeId Outcome)
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    (hEdge : EdgeInGrid grid edge) :
    edge.child ∈ grid.nodes := by
  rcases hEdge with ⟨hMem, hEq⟩
  rw [← hEq]
  exact grid.edge_child_mem edge.id hMem

theorem edge_in_grid_id_consistent
    (grid : ContractGrid ContractId EdgeId Outcome)
    {edge : BridgeEdgeSpec ContractId EdgeId Outcome}
    (hEdge : EdgeInGrid grid edge) :
    (grid.edgeOf edge.id).id = edge.id :=
  grid.edge_id_consistent edge.id hEdge.1

end ContractGrid

end Cdlc
