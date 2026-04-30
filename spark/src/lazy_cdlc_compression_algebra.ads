pragma SPARK_Mode (On);

package Lazy_Cdlc_Compression_Algebra with
  Ghost
is
   type Count is range 0 .. 1_000;
   type Weight is range 0 .. 1_000;
   type Amount is range 0 .. 3_000_000;

   function Layer_Cost
     (N : Count;
      W : Weight) return Amount
   is (Amount (N) * Amount (W));

   function Live_State
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

   procedure Prove_Valid_Compression_Reduces_Or_Equals
     (State0 : Count;
      State1 : Count;
      State2 : Count;
      Raw0   : Weight;
      Raw1   : Weight;
      Raw2   : Weight;
      Comp0  : Weight;
      Comp1  : Weight;
      Comp2  : Weight)
   with
     Global => null,
     Pre =>
       Comp0 <= Raw0
       and Comp1 <= Raw1
       and Comp2 <= Raw2,
     Post =>
       Live_State (State0, State1, State2, Comp0, Comp1, Comp2)
       <=
       Live_State (State0, State1, State2, Raw0, Raw1, Raw2);

   procedure Prove_Identity_Compression_Is_Equal
     (State0 : Count;
      State1 : Count;
      State2 : Count;
      Raw0   : Weight;
      Raw1   : Weight;
      Raw2   : Weight)
   with
     Global => null,
     Post =>
       Live_State (State0, State1, State2, Raw0, Raw1, Raw2)
       =
       Live_State (State0, State1, State2, Raw0, Raw1, Raw2);

   procedure Prove_Strict_Positive_Layer_Reduction
     (State0 : Count;
      State1 : Count;
      State2 : Count;
      Raw0   : Weight;
      Raw1   : Weight;
      Raw2   : Weight;
      Comp0  : Weight;
      Comp1  : Weight;
      Comp2  : Weight)
   with
     Global => null,
     Pre =>
       State0 > 0
       and Comp0 < Raw0
       and Comp1 <= Raw1
       and Comp2 <= Raw2,
     Post =>
       Live_State (State0, State1, State2, Comp0, Comp1, Comp2)
       <
       Live_State (State0, State1, State2, Raw0, Raw1, Raw2);

   procedure Prove_Compression_Is_Only_Weight_Substitution
     (State0 : Count;
      State1 : Count;
      State2 : Count;
      Comp0  : Weight;
      Comp1  : Weight;
      Comp2  : Weight)
   with
     Global => null,
     Post =>
       Live_State (State0, State1, State2, Comp0, Comp1, Comp2)
       =
       Layer_Cost (State0, Comp0)
       + Layer_Cost (State1, Comp1)
       + Layer_Cost (State2, Comp2);
end Lazy_Cdlc_Compression_Algebra;
