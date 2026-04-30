pragma SPARK_Mode (On);

package Lazy_Cdlc_Window_Algebra with
  Ghost
is
   type Node_Index is range 0 .. 7;
   type Outcome_Index is range 0 .. 7;
   type Depth is range 0 .. 8;

   subtype Distance is Depth range 0 .. 7;
   subtype Window_Depth is Depth range 1 .. 8;

   function In_Window
     (D : Distance;
      K : Window_Depth) return Boolean
   is (D < K);

   function Requires_Child_Preparation (Live : Boolean) return Boolean is
     (Live);

   function Child_Mapping_Valid
     (Live          : Boolean;
      Child_Defined : Boolean) return Boolean
   is ((not Live) or Child_Defined);

   function Valid_Window_Edge
     (Parent_Distance : Distance;
      Child_Distance  : Distance;
      K               : Window_Depth;
      Live            : Boolean;
      Child_Defined   : Boolean;
      Prepared        : Boolean) return Boolean
   is
     (Child_Mapping_Valid (Live, Child_Defined)
      and
      (if In_Window (Parent_Distance, K)
          and In_Window (Child_Distance, K)
          and Live
       then Prepared
       else True));

   procedure Prove_Terminal_Outcome_Does_Not_Require_Child
     (Parent_Distance : Distance;
      Child_Distance  : Distance;
      K               : Window_Depth)
   with
     Global => null,
     Post =>
       not Requires_Child_Preparation (False)
       and Valid_Window_Edge
             (Parent_Distance,
              Child_Distance,
              K,
              Live          => False,
              Child_Defined => False,
              Prepared      => False);

   procedure Prove_Live_Outcome_Requires_Child_Mapping
     (Parent_Distance : Distance;
      Child_Distance  : Distance;
      K               : Window_Depth;
      Prepared        : Boolean)
   with
     Global => null,
     Pre =>
       Valid_Window_Edge
         (Parent_Distance,
          Child_Distance,
          K,
          Live          => True,
          Child_Defined => Prepared,
          Prepared      => Prepared),
     Post => Prepared;

   procedure Prove_Valid_In_Window_Live_Edge_Is_Prepared
     (Parent_Distance : Distance;
      Child_Distance  : Distance;
      K               : Window_Depth;
      Child_Defined   : Boolean;
      Prepared        : Boolean)
   with
     Global => null,
     Pre =>
       Valid_Window_Edge
         (Parent_Distance,
          Child_Distance,
          K,
          Live          => True,
          Child_Defined => Child_Defined,
          Prepared      => Prepared)
       and In_Window (Parent_Distance, K)
       and In_Window (Child_Distance, K),
     Post => Prepared;

   procedure Prove_Out_Of_Window_Child_Preparation_Not_Required
     (Parent_Distance : Distance;
      Child_Distance  : Distance;
      K               : Window_Depth)
   with
     Global => null,
     Pre =>
       In_Window (Parent_Distance, K)
       and not In_Window (Child_Distance, K),
     Post =>
       Valid_Window_Edge
         (Parent_Distance,
          Child_Distance,
          K,
          Live          => True,
          Child_Defined => True,
          Prepared      => False);

   procedure Prove_Active_Node_In_Own_Window
     (K : Window_Depth)
   with
     Global => null,
     Post => In_Window (Distance'(0), K);

   procedure Prove_K1_Contains_Only_Active
     (D : Distance)
   with
     Global => null,
     Post => (In_Window (D, Window_Depth'(1)) = (D = Distance'(0)));

   procedure Prove_One_Step_Continuation_Needs_K2
     (K : Window_Depth)
   with
     Global => null,
     Post => (In_Window (Distance'(1), K) = (K >= Window_Depth'(2)));
end Lazy_Cdlc_Window_Algebra;
