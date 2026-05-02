pragma SPARK_Mode (On);

package body Lazy_Cdlc_Financial_Completeness_Algebra is

   function Apply_Flow
     (S           : Financial_State;
      F           : Transfer_Flow;
      Target      : State_Class) return Financial_State is
   begin
      case F.Direction is
         when No_Flow =>
            return
              (Class   => Target,
               Alice   => S.Alice,
               Bob     => S.Bob,
               Reserve => S.Reserve);
         when Alice_Gains =>
            return
              (Class   => Target,
               Alice   => S.Alice + F.Quantity,
               Bob     => S.Bob - F.Quantity,
               Reserve => S.Reserve);
         when Bob_Gains =>
            return
              (Class   => Target,
               Alice   => S.Alice - F.Quantity,
               Bob     => S.Bob + F.Quantity,
               Reserve => S.Reserve);
      end case;
   end Apply_Flow;

   function Step
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id) return Financial_State is
   begin
      return Apply_Flow (S, B.Flow, B.Target);
   end Step;

   function Canonical_Terminal_Payout
     (S : Financial_State) return Terminal_Payout is
      P : constant Terminal_Payout :=
        (Alice     => S.Alice,
         Bob       => S.Bob,
         Remainder => S.Reserve);
   begin
      pragma Assert (Terminal_Payout_Conserves (S, P));
      return P;
   end Canonical_Terminal_Payout;

   procedure Prove_No_Flow_Preserves_Balances
     (S      : Financial_State;
      Target : State_Class) is
      N : constant Financial_State := Apply_Flow (S, (No_Flow, 0), Target);
   begin
      pragma Assert (N.Alice = S.Alice);
      pragma Assert (N.Bob = S.Bob);
      pragma Assert (N.Reserve = S.Reserve);
      pragma Assert (Total (N) = Total (S));
   end Prove_No_Flow_Preserves_Balances;

   procedure Prove_Alice_Gain_Is_Bob_Loss
     (S        : Financial_State;
      Quantity : Balance;
      Target   : State_Class) is
      F : constant Transfer_Flow := (Alice_Gains, Quantity);
      N : constant Financial_State := Apply_Flow (S, F, Target);
   begin
      pragma Assert (N.Alice = S.Alice + Quantity);
      pragma Assert (N.Bob = S.Bob - Quantity);
      pragma Assert (N.Reserve = S.Reserve);
      pragma Assert
        (Total_Amount (S.Alice + Quantity)
         + Total_Amount (S.Bob - Quantity)
         + Total_Amount (S.Reserve)
         =
         Total_Amount (S.Alice)
         + Total_Amount (S.Bob)
         + Total_Amount (S.Reserve));
      pragma Assert (Total (N) = Total (S));
   end Prove_Alice_Gain_Is_Bob_Loss;

   procedure Prove_Bob_Gain_Is_Alice_Loss
     (S        : Financial_State;
      Quantity : Balance;
      Target   : State_Class) is
      F : constant Transfer_Flow := (Bob_Gains, Quantity);
      N : constant Financial_State := Apply_Flow (S, F, Target);
   begin
      pragma Assert (N.Alice = S.Alice - Quantity);
      pragma Assert (N.Bob = S.Bob + Quantity);
      pragma Assert (N.Reserve = S.Reserve);
      pragma Assert
        (Total_Amount (S.Alice - Quantity)
         + Total_Amount (S.Bob + Quantity)
         + Total_Amount (S.Reserve)
         =
         Total_Amount (S.Alice)
         + Total_Amount (S.Bob)
         + Total_Amount (S.Reserve));
      pragma Assert (Total (N) = Total (S));
   end Prove_Bob_Gain_Is_Alice_Loss;

   procedure Prove_Prepared_Matching_Branch_Activates
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id) is
   begin
      pragma Assert (Branch_Matches (S, B, Outcome));
      pragma Assert (B.Prepared);
      pragma Assert (Activation (S, B, Outcome) = Activated);
   end Prove_Prepared_Matching_Branch_Activates;

   procedure Prove_Wrong_Outcome_Falls_Back
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id) is
   begin
      pragma Assert (not Branch_Matches (S, B, Outcome));
      pragma Assert (Activation (S, B, Outcome) = Fallback);
   end Prove_Wrong_Outcome_Falls_Back;

   procedure Prove_Unprepared_Matching_Branch_Falls_Back
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id) is
   begin
      pragma Assert (Branch_Matches (S, B, Outcome));
      pragma Assert (not B.Prepared);
      pragma Assert (Activation (S, B, Outcome) = Fallback);
   end Prove_Unprepared_Matching_Branch_Falls_Back;

   procedure Prove_Compiled_Step_Preserves_Total
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id) is
      N : constant Financial_State := Step (S, B, Outcome);
   begin
      pragma Assert (B.Prepared);
      pragma Assert (Branch_Matches (S, B, Outcome));

      case B.Flow.Direction is
         when No_Flow =>
            Prove_No_Flow_Preserves_Balances (S, B.Target);
         when Alice_Gains =>
            Prove_Alice_Gain_Is_Bob_Loss
              (S, B.Flow.Quantity, B.Target);
         when Bob_Gains =>
            Prove_Bob_Gain_Is_Alice_Loss
              (S, B.Flow.Quantity, B.Target);
      end case;

      pragma Assert (N = Apply_Flow (S, B.Flow, B.Target));
      pragma Assert (Total (N) = Total (S));
      pragma Assert (N.Class = B.Target);
   end Prove_Compiled_Step_Preserves_Total;

   procedure Prove_Equivalent_States_Share_Continuation
     (Left  : Financial_State;
      Right : Financial_State) is
   begin
      pragma Assert (Continuation_Template (Left) = Left.Class);
      pragma Assert (Continuation_Template (Right) = Right.Class);
      pragma Assert (Continuation_Template (Left) =
                       Continuation_Template (Right));
   end Prove_Equivalent_States_Share_Continuation;

   procedure Prove_Lazy_Window_Prepared_Step_Is_Executable
     (S       : Financial_State;
      B       : Compiled_Branch;
      Outcome : Outcome_Id;
      D       : Distance;
      K       : Window_Depth) is
   begin
      pragma Assert (In_Window (D, K));
      pragma Assert (Branch_Matches (S, B, Outcome));
      pragma Assert (B.Prepared);
      pragma Assert (Activation (S, B, Outcome) = Activated);
   end Prove_Lazy_Window_Prepared_Step_Is_Executable;

   procedure Prove_Out_Of_Window_Does_Not_Claim_Preparation
     (B : Compiled_Branch;
      D : Distance;
      K : Window_Depth) is
   begin
      pragma Assert (not In_Window (D, K));
      pragma Assert (not Branch_Prepared_In_Window (B, D, K));
   end Prove_Out_Of_Window_Does_Not_Claim_Preparation;

   procedure Prove_Terminal_Payout_Conserves_Total
     (S : Financial_State) is
      P : constant Terminal_Payout := Canonical_Terminal_Payout (S);
   begin
      pragma Assert (Terminal_Payout_Conserves (S, P));
   end Prove_Terminal_Payout_Conserves_Total;

end Lazy_Cdlc_Financial_Completeness_Algebra;
