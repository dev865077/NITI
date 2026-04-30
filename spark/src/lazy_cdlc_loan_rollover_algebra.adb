pragma SPARK_Mode (On);

package body Lazy_Cdlc_Loan_Rollover_Algebra is
   procedure Prove_Rollover_Selected_Implies_Prepared
     (Rollover_Selected : Boolean;
      Prepared          : Boolean;
      Announce          : Time_Value;
      Observe           : Time_Value;
      Prep              : Time_Delta;
      Margin            : Time_Delta) is
   begin
      null;
   end Prove_Rollover_Selected_Implies_Prepared;

   procedure Prove_Failed_Gate_Prevents_Rollover
     (Rollover_Selected : Boolean;
      Prepared          : Boolean;
      Announce          : Time_Value;
      Observe           : Time_Value;
      Prep              : Time_Delta;
      Margin            : Time_Delta) is
   begin
      null;
   end Prove_Failed_Gate_Prevents_Rollover;

   procedure Prove_Branches_Disjoint_And_Complete
     (Rollover_Selected : Boolean;
      Prepared          : Boolean;
      Announce          : Time_Value;
      Observe           : Time_Value;
      Prep              : Time_Delta;
      Margin            : Time_Delta) is
   begin
      null;
   end Prove_Branches_Disjoint_And_Complete;

   procedure Prove_Rollover_Uses_Prepared_Child_State
     (Parent : Loan_State;
      Child  : Loan_State) is
   begin
      null;
   end Prove_Rollover_Uses_Prepared_Child_State;

   procedure Prove_Fallback_Conserves_BTC
     (State     : Loan_State;
      DebtClaim : Amount) is
   begin
      null;
   end Prove_Fallback_Conserves_BTC;
end Lazy_Cdlc_Loan_Rollover_Algebra;
