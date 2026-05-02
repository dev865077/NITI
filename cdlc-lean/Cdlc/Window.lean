import Cdlc.ContractGrid

namespace Cdlc

variable {ContractId EdgeId Outcome : Type*}
variable [DecidableEq ContractId] [DecidableEq EdgeId]

/--
A protocol state whose active lazy window is materialized against a finite
contract grid.
-/
structure MaterializedWindow
    (grid : ContractGrid ContractId EdgeId Outcome)
    (st : ProtocolState ContractId EdgeId) : Prop where
  active_matches : st.active = grid.active
  materialized_subset_nodes :
    ∀ {id : ContractId}, id ∈ st.materialized → id ∈ grid.nodes
  live_subset_edges :
    ∀ {id : EdgeId}, id ∈ st.liveEdges → id ∈ grid.edges
  retained_subset_edges :
    ∀ {id : EdgeId}, id ∈ st.retainedEdges → id ∈ grid.edges
  window : WindowMaterialization st grid.edgeOf

namespace MaterializedWindow

theorem active_grid_node
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st) :
    st.active ∈ grid.nodes := by
  rw [hWindow.active_matches]
  exact grid.active_mem

theorem active_materialized
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st) :
    st.active ∈ st.materialized :=
  hWindow.window.active_materialized

theorem live_edge_in_grid
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st)
    {id : EdgeId} (hLive : id ∈ st.liveEdges) :
    id ∈ grid.edges :=
  hWindow.live_subset_edges hLive

theorem retained_edge_in_grid
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st)
    {id : EdgeId} (hRetained : id ∈ st.retainedEdges) :
    id ∈ grid.edges :=
  hWindow.retained_subset_edges hRetained

theorem live_edge_id_consistent
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st)
    {id : EdgeId} (hLive : id ∈ st.liveEdges) :
    (grid.edgeOf id).id = id :=
  grid.edge_id_consistent id (hWindow.live_subset_edges hLive)

theorem live_edge_child_materialized
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st)
    {id : EdgeId} (hLive : id ∈ st.liveEdges)
    (hParent : (grid.edgeOf id).parent = st.active) :
    (grid.edgeOf id).child ∈ st.materialized :=
  hWindow.window.live_child_materialized id hLive hParent

theorem live_edge_child_in_grid
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st)
    {id : EdgeId} (hLive : id ∈ st.liveEdges) :
    (grid.edgeOf id).child ∈ grid.nodes :=
  grid.edge_child_mem id (hWindow.live_subset_edges hLive)

theorem live_edge_retained
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st)
    {id : EdgeId} (hLive : id ∈ st.liveEdges) :
    id ∈ st.retainedEdges :=
  hWindow.window.live_edge_retained id hLive

theorem live_edge_prepared
    {Scalar : Type*}
    {grid : ContractGrid ContractId EdgeId Outcome}
    {st : ProtocolState ContractId EdgeId}
    (hWindow : MaterializedWindow grid st)
    {id : EdgeId} (hLive : id ∈ st.liveEdges)
    (hParent : (grid.edgeOf id).parent = st.active)
    {adaptors : AdaptorSet Scalar} (hVerified : adaptors.verified) :
    EdgePrepared st (grid.edgeOf id) adaptors :=
  window_materialization_prepares_live_edge
    (hWindow := hWindow.window)
    hLive
    (hWindow.live_edge_id_consistent hLive)
    hParent
    hVerified

end MaterializedWindow

end Cdlc
