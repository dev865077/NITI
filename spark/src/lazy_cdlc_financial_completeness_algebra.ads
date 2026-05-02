pragma SPARK_Mode (On);

package Lazy_Cdlc_Financial_Completeness_Algebra with
  Ghost
is
   type Balance is range 0 .. 1_000_000;
   type Total_Amount is range 0 .. 3_000_000;
   type State_Class is range 0 .. 255;
   type Outcome_Id is range 0 .. 255;
   type Window_Depth is range 1 .. 16;
   type Distance is range 0 .. 15;

   type Flow_Direction is (No_Flow, Alice_Gains, Bob_Gains);
   type Activation_Status is (Activated, Fallback);

   type Financial_State is record
      Class   : State_Class;
      Alice   : Balance;
      Bob     : Balance;
      Reserve : Balance;
   end record;

   type Terminal_Payout is record
      Alice     : Balance;
      Bob       : Balance;
      Remainder : Balance;
   end record;

   type Transfer_Flow is record
      Direction : Flow_Direction;
      Quantity  : Balance;
   end record;

   type Compiled_Branch is record
      Source   : State_Class;
      Outcome  : Outcome_Id;
      Target   : State_Class;
      Flow     : Transfer_Flow;
      Prepared : Boolean;
   end record;

   function Total (S : Financial_State) return Total_Amount is
     (Total_Amount (S.Alice)
      + Total_Amount (S.Bob)
      + Total_Amount (S.Reserve));

   function In_Window
     (D : Distance;
      K : Window_Depth) return Boolean
   is (Integer (D) < Integer (K));

   function Flow_Allowed
     (S : Financial_State;
      F : Transfer_Flow) return Boolean
   is
     (case F.Direction is
        when No_Flow =>
          F.Quantity = 0,
        when Alice_Gains =>
          S.Bob >= F.Quantity
          and S.Alice <= Balance'Last - F.Quantity,
        when Bob_Gains =>
          S.Alice >= F.Quantity
          and S.Bob <= Balance'Last - F.Quantity);

   function Apply_Flow
     (S           : Financial_State;
      F           : Transfer_Flow;
      Target      : State_Class) return Financial_State
   with
     Pre => Flow_Allowed (S, F),
     Post =>
       Apply_Flow'Result.Class = Target
       and Apply_Flow'Result.Reserve = S.Reserve
       and Total (Apply_Flow'Result) = Total (S)
       and
       (case F.Direction is
          when No_Flow =>
            Apply_Flow'Result.Alice = S.Alice
            and Apply_Flow'Result.Bob = S.Bob,
          when Alice_Gains =>
            Apply_Flow'Result.Alice = S.Alice + F.Quantity
            and Apply_Flow'Result.Bob = S.Bob - F.Quantity,
          when Bob_Gains =>
            Apply_Flow'Result.Alice = S.Alice - F.Quantity
            and Apply_Flow'Result.Bob = S.Bob + F.Quantity);

   function Branch_Matches
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id) return Boolean
   is
     (S.Class = B.Source
      and Outcome = B.Outcome);

   function Branch_Prepared_In_Window
     (B : Compiled_Branch;
      D : Distance;
      K : Window_Depth) return Boolean
   is
     (B.Prepared and In_Window (D, K));

   function Activation
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id) return Activation_Status
   is
     (if Branch_Matches (S, B, Outcome) and B.Prepared
      then Activated
      else Fallback);

   function Step
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id) return Financial_State
   with
     Pre =>
       Activation (S, B, Outcome) = Activated
       and Flow_Allowed (S, B.Flow),
     Post =>
       Step'Result = Apply_Flow (S, B.Flow, B.Target)
       and Total (Step'Result) = Total (S)
       and Step'Result.Class = B.Target;

   function Continuation_Template
     (S : Financial_State) return State_Class
   is (S.Class);

   function Terminal_Payout_Conserves
     (S : Financial_State;
      P : Terminal_Payout) return Boolean
   is
     (Total_Amount (P.Alice)
      + Total_Amount (P.Bob)
      + Total_Amount (P.Remainder)
      = Total (S));

   function Canonical_Terminal_Payout
     (S : Financial_State) return Terminal_Payout
   with
     Post =>
       Canonical_Terminal_Payout'Result.Alice = S.Alice
       and Canonical_Terminal_Payout'Result.Bob = S.Bob
       and Canonical_Terminal_Payout'Result.Remainder = S.Reserve
       and Terminal_Payout_Conserves
             (S, Canonical_Terminal_Payout'Result);

   procedure Prove_No_Flow_Preserves_Balances
     (S      : Financial_State;
      Target : State_Class)
   with
     Global => null,
     Post =>
       Flow_Allowed (S, (No_Flow, 0))
       and Total (Apply_Flow (S, (No_Flow, 0), Target)) = Total (S)
       and Apply_Flow (S, (No_Flow, 0), Target).Alice = S.Alice
       and Apply_Flow (S, (No_Flow, 0), Target).Bob = S.Bob
       and Apply_Flow (S, (No_Flow, 0), Target).Reserve = S.Reserve;

   procedure Prove_Alice_Gain_Is_Bob_Loss
     (S        : Financial_State;
      Quantity : Balance;
      Target   : State_Class)
   with
     Global => null,
     Pre =>
       S.Bob >= Quantity
       and S.Alice <= Balance'Last - Quantity,
     Post =>
       Total (Apply_Flow (S, (Alice_Gains, Quantity), Target)) = Total (S)
       and Apply_Flow (S, (Alice_Gains, Quantity), Target).Alice =
             S.Alice + Quantity
       and Apply_Flow (S, (Alice_Gains, Quantity), Target).Bob =
             S.Bob - Quantity
       and Apply_Flow (S, (Alice_Gains, Quantity), Target).Reserve =
             S.Reserve;

   procedure Prove_Bob_Gain_Is_Alice_Loss
     (S        : Financial_State;
      Quantity : Balance;
      Target   : State_Class)
   with
     Global => null,
     Pre =>
       S.Alice >= Quantity
       and S.Bob <= Balance'Last - Quantity,
     Post =>
       Total (Apply_Flow (S, (Bob_Gains, Quantity), Target)) = Total (S)
       and Apply_Flow (S, (Bob_Gains, Quantity), Target).Alice =
             S.Alice - Quantity
       and Apply_Flow (S, (Bob_Gains, Quantity), Target).Bob =
             S.Bob + Quantity
       and Apply_Flow (S, (Bob_Gains, Quantity), Target).Reserve =
             S.Reserve;

   procedure Prove_Prepared_Matching_Branch_Activates
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id)
   with
     Global => null,
     Pre =>
       B.Prepared
       and Branch_Matches (S, B, Outcome),
     Post => Activation (S, B, Outcome) = Activated;

   procedure Prove_Wrong_Outcome_Falls_Back
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id)
   with
     Global => null,
     Pre => Outcome /= B.Outcome,
     Post => Activation (S, B, Outcome) = Fallback;

   procedure Prove_Unprepared_Matching_Branch_Falls_Back
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id)
   with
     Global => null,
     Pre =>
       not B.Prepared
       and Branch_Matches (S, B, Outcome),
     Post => Activation (S, B, Outcome) = Fallback;

   procedure Prove_Compiled_Step_Preserves_Total
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id)
   with
     Global => null,
     Pre =>
       Activation (S, B, Outcome) = Activated
       and Flow_Allowed (S, B.Flow),
     Post =>
       Total (Step (S, B, Outcome)) = Total (S)
       and Step (S, B, Outcome).Class = B.Target;

   procedure Prove_Equivalent_States_Share_Continuation
     (Left  : Financial_State;
      Right : Financial_State)
   with
     Global => null,
     Pre => Left.Class = Right.Class,
     Post => Continuation_Template (Left) = Continuation_Template (Right);

   procedure Prove_Lazy_Window_Prepared_Step_Is_Executable
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id;
      D       : Distance;
      K       : Window_Depth)
   with
     Global => null,
     Pre =>
       In_Window (D, K)
       and B.Prepared
       and Branch_Matches (S, B, Outcome),
     Post => Activation (S, B, Outcome) = Activated;

   procedure Prove_Out_Of_Window_Does_Not_Claim_Preparation
     (B : Compiled_Branch;
      D : Distance;
      K : Window_Depth)
   with
     Global => null,
     Pre => not In_Window (D, K),
     Post => not Branch_Prepared_In_Window (B, D, K);

   procedure Prove_Terminal_Payout_Conserves_Total
     (S : Financial_State)
   with
     Global => null,
     Post =>
       Terminal_Payout_Conserves (S, Canonical_Terminal_Payout (S));

end Lazy_Cdlc_Financial_Completeness_Algebra;
