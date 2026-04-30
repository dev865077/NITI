pragma SPARK_Mode (On);

package Lazy_Cdlc_Tree_Bound_Algebra with
  Ghost
is
   type Amount is range 0 .. 2_000_000;
   type Branching is range 2 .. 4;
   type Layer is range 0 .. 5;
   subtype Step_Layer is Layer range 0 .. 4;
   type Window_Depth is range 1 .. 6;
   type Weight is range 0 .. 1_000;

   function Pow
     (B : Branching;
      N : Layer) return Amount
   is
     (case N is
        when 0 => 1,
        when 1 => Amount (B),
        when 2 => Amount (B) * Amount (B),
        when 3 => Amount (B) * Amount (B) * Amount (B),
        when 4 => Amount (B) * Amount (B) * Amount (B) * Amount (B),
        when 5 => Amount (B) * Amount (B) * Amount (B) * Amount (B)
                  * Amount (B));

   function Geom
     (B : Branching;
      N : Layer) return Amount
   is
     (case N is
        when 0 => 1,
        when 1 => 1 + Pow (B, 1),
        when 2 => 1 + Pow (B, 1) + Pow (B, 2),
        when 3 => 1 + Pow (B, 1) + Pow (B, 2) + Pow (B, 3),
        when 4 => 1 + Pow (B, 1) + Pow (B, 2) + Pow (B, 3)
                  + Pow (B, 4),
        when 5 => 1 + Pow (B, 1) + Pow (B, 2) + Pow (B, 3)
                  + Pow (B, 4) + Pow (B, 5));

   function Window_Last_Layer (K : Window_Depth) return Layer is
     (case K is
        when 1 => 0,
        when 2 => 1,
        when 3 => 2,
        when 4 => 3,
        when 5 => 4,
        when 6 => 5);

   function Eager_Nodes
     (B : Branching;
      D : Layer) return Amount
   is (Geom (B, D));

   function Lazy_Nodes
     (B : Branching;
      K : Window_Depth) return Amount
   is (Geom (B, Window_Last_Layer (K)));

   function Eager_State
     (B : Branching;
      D : Layer;
      P : Weight) return Amount
   is (Amount (P) * Eager_Nodes (B, D));

   function Lazy_State
     (B : Branching;
      K : Window_Depth;
      P : Weight) return Amount
   is (Amount (P) * Lazy_Nodes (B, K));

   procedure Prove_Geom_Step
     (B : Branching;
      N : Step_Layer)
   with
     Global => null,
     Post => Geom (B, Layer'Succ (N)) = Geom (B, N) + Pow (B, Layer'Succ (N));

   procedure Prove_Lazy_Nodes_Bounded_By_Eager
     (B : Branching;
      D : Layer;
      K : Window_Depth)
   with
     Global => null,
     Pre => Window_Last_Layer (K) <= D,
     Post => Lazy_Nodes (B, K) <= Eager_Nodes (B, D);

   procedure Prove_Lazy_State_Bounded_By_Eager
     (B : Branching;
      D : Layer;
      K : Window_Depth;
      P : Weight)
   with
     Global => null,
     Pre => Window_Last_Layer (K) <= D,
     Post => Lazy_State (B, K, P) <= Eager_State (B, D, P);

   procedure Prove_Lazy_State_Independent_Of_Total_Depth
     (B      : Branching;
      K      : Window_Depth;
      P      : Weight;
      Depth1 : Layer;
      Depth2 : Layer)
   with
     Global => null,
     Pre => Window_Last_Layer (K) <= Depth1
            and Window_Last_Layer (K) <= Depth2,
     Post => Lazy_State (B, K, P) = Lazy_State (B, K, P);

   procedure Prove_Larger_Window_Weakly_Increases_State
     (B  : Branching;
      K1 : Window_Depth;
      K2 : Window_Depth;
      P  : Weight)
   with
     Global => null,
     Pre => K1 <= K2,
     Post => Lazy_State (B, K1, P) <= Lazy_State (B, K2, P);
end Lazy_Cdlc_Tree_Bound_Algebra;
