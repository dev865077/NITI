pragma SPARK_Mode (On);

package Lazy_Cdlc_Recombining_Algebra with
  Ghost
is
   type Count is range 0 .. 1_000;
   type Weight is range 0 .. 1_000;
   type Amount is range 0 .. 3_000_000;

   function Layer_Cost
     (N : Count;
      W : Weight) return Amount
   is (Amount (N) * Amount (W));

   function Three_Layer_State
     (L0_Count : Count;
      L1_Count : Count;
      L2_Count : Count;
      W0       : Weight;
      W1       : Weight;
      W2       : Weight) return Amount
   is
     (Layer_Cost (L0_Count, W0)
      + Layer_Cost (L1_Count, W1)
      + Layer_Cost (L2_Count, W2));

   procedure Prove_Recombined_State_Bounded
     (Path0  : Count;
      Path1  : Count;
      Path2  : Count;
      State0 : Count;
      State1 : Count;
      State2 : Count;
      W0     : Weight;
      W1     : Weight;
      W2     : Weight)
   with
     Global => null,
     Pre =>
       State0 <= Path0
       and State1 <= Path1
       and State2 <= Path2,
     Post =>
       Three_Layer_State (State0, State1, State2, W0, W1, W2)
       <=
       Three_Layer_State (Path0, Path1, Path2, W0, W1, W2);

   procedure Prove_Identity_Recombination_No_Reduction
     (Path0 : Count;
      Path1 : Count;
      Path2 : Count;
      W0    : Weight;
      W1    : Weight;
      W2    : Weight)
   with
     Global => null,
     Post =>
       Three_Layer_State (Path0, Path1, Path2, W0, W1, W2)
       =
       Three_Layer_State (Path0, Path1, Path2, W0, W1, W2);

   procedure Prove_Strict_Reduction_On_Positive_Layer
     (Path0  : Count;
      Path1  : Count;
      Path2  : Count;
      State0 : Count;
      State1 : Count;
      State2 : Count;
      W0     : Weight;
      W1     : Weight;
      W2     : Weight)
   with
     Global => null,
     Pre =>
       State0 < Path0
       and W0 > 0
       and State1 <= Path1
       and State2 <= Path2,
     Post =>
       Three_Layer_State (State0, State1, State2, W0, W1, W2)
       <
       Three_Layer_State (Path0, Path1, Path2, W0, W1, W2);

   procedure Prove_Layer_Sum_Composition
     (State0 : Count;
      State1 : Count;
      State2 : Count;
      W0     : Weight;
      W1     : Weight;
      W2     : Weight)
   with
     Global => null,
     Post =>
       Three_Layer_State (State0, State1, State2, W0, W1, W2)
       =
       Layer_Cost (State0, W0)
       + Layer_Cost (State1, W1)
       + Layer_Cost (State2, W2);
end Lazy_Cdlc_Recombining_Algebra;
