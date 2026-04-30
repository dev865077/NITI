pragma SPARK_Mode (On);

package Lazy_Cdlc_Loan_Rollover_Algebra with
  Ghost
is
   type Amount is range 0 .. 1_000_000;
   type Time_Value is range 0 .. 1_000_000;
   subtype Time_Delta is Time_Value range 0 .. 100_000;

   type Loan_Branch is (Rollover, Fallback);

   type Loan_State is record
      Collateral : Amount;
      Debt       : Amount;
   end record;

   function Min (A, B : Amount) return Amount is
     (if A <= B then A else B);

   function Ready_Time
     (Announce : Time_Value;
      Prep     : Time_Delta;
      Margin   : Time_Delta) return Time_Value
   is (Announce + Prep + Margin)
   with
     Pre => Announce <= 800_000;

   function Timing_OK
     (Announce : Time_Value;
      Observe  : Time_Value;
      Prep     : Time_Delta;
      Margin   : Time_Delta) return Boolean
   is (Ready_Time (Announce, Prep, Margin) < Observe)
   with
     Pre => Announce <= 800_000;

   function Rollover_Available
     (Prepared : Boolean;
      Announce : Time_Value;
      Observe  : Time_Value;
      Prep     : Time_Delta;
      Margin   : Time_Delta) return Boolean
   is (Prepared and Timing_OK (Announce, Observe, Prep, Margin))
   with
     Pre => Announce <= 800_000;

   function Select_Branch
     (Rollover_Selected : Boolean;
      Prepared          : Boolean;
      Announce          : Time_Value;
      Observe           : Time_Value;
      Prep              : Time_Delta;
      Margin            : Time_Delta) return Loan_Branch
   is
     (if Rollover_Selected
         and Rollover_Available (Prepared, Announce, Observe, Prep, Margin)
      then Rollover
      else Fallback)
   with
     Pre => Announce <= 800_000;

   function Rollover_State
     (Parent : Loan_State;
      Child  : Loan_State) return Loan_State
   is (Child)
   with
     Pre => Parent.Collateral >= 0 and Parent.Debt >= 0
            and Child.Collateral >= 0 and Child.Debt >= 0;

   function Fallback_Lender_Output
     (State     : Loan_State;
      DebtClaim : Amount) return Amount
   is (Min (State.Collateral, DebtClaim));

   function Fallback_Borrower_Output
     (State     : Loan_State;
      DebtClaim : Amount) return Amount
   is (State.Collateral - Fallback_Lender_Output (State, DebtClaim));

   procedure Prove_Rollover_Selected_Implies_Prepared
     (Rollover_Selected : Boolean;
      Prepared          : Boolean;
      Announce          : Time_Value;
      Observe           : Time_Value;
      Prep              : Time_Delta;
      Margin            : Time_Delta)
   with
     Global => null,
     Pre =>
       Announce <= 800_000
       and then Select_Branch
         (Rollover_Selected, Prepared, Announce, Observe, Prep, Margin)
         = Rollover,
     Post => Prepared;

   procedure Prove_Failed_Gate_Prevents_Rollover
     (Rollover_Selected : Boolean;
      Prepared          : Boolean;
      Announce          : Time_Value;
      Observe           : Time_Value;
      Prep              : Time_Delta;
      Margin            : Time_Delta)
   with
     Global => null,
     Pre =>
       Announce <= 800_000
       and then
       (not Prepared or else not Timing_OK (Announce, Observe, Prep, Margin)),
     Post =>
       Select_Branch
         (Rollover_Selected, Prepared, Announce, Observe, Prep, Margin)
       = Fallback;

   procedure Prove_Branches_Disjoint_And_Complete
     (Rollover_Selected : Boolean;
      Prepared          : Boolean;
      Announce          : Time_Value;
      Observe           : Time_Value;
      Prep              : Time_Delta;
      Margin            : Time_Delta)
   with
     Global => null,
     Pre => Announce <= 800_000,
     Post =>
       (Select_Branch
          (Rollover_Selected, Prepared, Announce, Observe, Prep, Margin)
        = Rollover)
       /=
       (Select_Branch
          (Rollover_Selected, Prepared, Announce, Observe, Prep, Margin)
        = Fallback);

   procedure Prove_Rollover_Uses_Prepared_Child_State
     (Parent : Loan_State;
      Child  : Loan_State)
   with
     Global => null,
     Post =>
       Rollover_State (Parent, Child).Collateral = Child.Collateral
       and Rollover_State (Parent, Child).Debt = Child.Debt;

   procedure Prove_Fallback_Conserves_BTC
     (State     : Loan_State;
      DebtClaim : Amount)
   with
     Global => null,
     Post =>
       Fallback_Lender_Output (State, DebtClaim)
       + Fallback_Borrower_Output (State, DebtClaim)
       = State.Collateral;
end Lazy_Cdlc_Loan_Rollover_Algebra;
