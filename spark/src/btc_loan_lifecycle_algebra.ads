pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Btc_Loan_Lifecycle_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Price is Valid_Big_Integer;
   subtype Ratio_Component is Valid_Big_Integer;

   SAT : constant Amount := 100_000_000;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);

   function Min (A, B : Amount) return Amount is
     (if A <= B then A else B)
   with
     Pre => Nonnegative (A) and Nonnegative (B);

   --  #12: CollateralScaled(Q, S) = Q * S.
   function Collateral_Scaled
     (Collateral_Sats : Amount;
      Price_Cents     : Price) return Amount
   is (Collateral_Sats * Price_Cents)
   with
     Pre => Nonnegative (Collateral_Sats) and Positive (Price_Cents);

   --  #12: DebtScaled(D) = D * B.
   function Debt_Scaled (Debt_Cents : Amount) return Amount is
     (Debt_Cents * SAT)
   with
     Pre => Nonnegative (Debt_Cents);

   --  #12: D_accr = D + I - R.
   function Debt_After_Accrual
     (Debt_Cents      : Amount;
      Interest_Cents  : Amount;
      Repayment_Cents : Amount) return Amount
   is (Debt_Cents + Interest_Cents - Repayment_Cents)
   with
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Interest_Cents)
       and Nonnegative (Repayment_Cents)
       and Repayment_Cents <= Debt_Cents + Interest_Cents;

   --  #12: D * B * Theta_Den <= Theta_Num * Q * S.
   function LTV_At_Or_Below
     (Debt_Cents     : Amount;
      Collateral_Sats : Amount;
      Price_Cents    : Price;
      Theta_Num      : Ratio_Component;
      Theta_Den      : Ratio_Component) return Boolean
   is
     (Debt_Cents * SAT * Theta_Den
      <= Theta_Num * Collateral_Sats * Price_Cents)
   with
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Theta_Num)
       and Positive (Theta_Den);

   function LTV_Above
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Theta_Num       : Ratio_Component;
      Theta_Den       : Ratio_Component) return Boolean
   is
     (Debt_Cents * SAT * Theta_Den
      > Theta_Num * Collateral_Sats * Price_Cents)
   with
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Theta_Num)
       and Positive (Theta_Den);

   function Ratio_LE
     (A_Num : Ratio_Component;
      A_Den : Ratio_Component;
      B_Num : Ratio_Component;
      B_Den : Ratio_Component) return Boolean
   is (A_Num * B_Den <= B_Num * A_Den)
   with
     Pre =>
       Nonnegative (A_Num)
       and Positive (A_Den)
       and Nonnegative (B_Num)
       and Positive (B_Den);

   function Ratio_LT
     (A_Num : Ratio_Component;
      A_Den : Ratio_Component;
      B_Num : Ratio_Component;
      B_Den : Ratio_Component) return Boolean
   is (A_Num * B_Den < B_Num * A_Den)
   with
     Pre =>
       Nonnegative (A_Num)
       and Positive (A_Den)
       and Nonnegative (B_Num)
       and Positive (B_Den);

   --  #12: Theta_Target <= Theta_Roll < Theta_Call < Theta_Liq.
   function Ordered_Thresholds
     (Target_Num : Ratio_Component;
      Target_Den : Ratio_Component;
      Roll_Num   : Ratio_Component;
      Roll_Den   : Ratio_Component;
      Call_Num   : Ratio_Component;
      Call_Den   : Ratio_Component;
      Liq_Num    : Ratio_Component;
      Liq_Den    : Ratio_Component) return Boolean
   is
     (Ratio_LE (Target_Num, Target_Den, Roll_Num, Roll_Den)
      and Ratio_LT (Roll_Num, Roll_Den, Call_Num, Call_Den)
      and Ratio_LT (Call_Num, Call_Den, Liq_Num, Liq_Den))
   with
     Pre =>
       Nonnegative (Target_Num)
       and Positive (Target_Den)
       and Nonnegative (Roll_Num)
       and Positive (Roll_Den)
       and Nonnegative (Call_Num)
       and Positive (Call_Den)
       and Nonnegative (Liq_Num)
       and Positive (Liq_Den);

   function Healthy
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Roll_Num        : Ratio_Component;
      Roll_Den        : Ratio_Component) return Boolean
   is
     (LTV_At_Or_Below
        (Debt_Cents, Collateral_Sats, Price_Cents, Roll_Num, Roll_Den))
   with
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Roll_Num)
       and Positive (Roll_Den);

   function Watch
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Roll_Num        : Ratio_Component;
      Roll_Den        : Ratio_Component;
      Call_Num        : Ratio_Component;
      Call_Den        : Ratio_Component) return Boolean
   is
     (LTV_Above
        (Debt_Cents, Collateral_Sats, Price_Cents, Roll_Num, Roll_Den)
      and then
        LTV_At_Or_Below
          (Debt_Cents, Collateral_Sats, Price_Cents, Call_Num, Call_Den))
   with
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Roll_Num)
       and Positive (Roll_Den)
       and Nonnegative (Call_Num)
       and Positive (Call_Den);

   function Margin_Call
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Call_Num        : Ratio_Component;
      Call_Den        : Ratio_Component;
      Liq_Num         : Ratio_Component;
      Liq_Den         : Ratio_Component) return Boolean
   is
     (LTV_Above
        (Debt_Cents, Collateral_Sats, Price_Cents, Call_Num, Call_Den)
      and then
        LTV_At_Or_Below
          (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den))
   with
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Call_Num)
       and Positive (Call_Den)
       and Nonnegative (Liq_Num)
       and Positive (Liq_Den);

   function Liquidation
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Liq_Num         : Ratio_Component;
      Liq_Den         : Ratio_Component) return Boolean
   is
     (LTV_Above
        (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den))
   with
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Liq_Num)
       and Positive (Liq_Den);

   --  #12: Q_next = Q - FeeBTC.
   function Refi_Collateral
     (Collateral_Sats : Amount;
      Fee_Sats        : Amount) return Amount
   is (Collateral_Sats - Fee_Sats)
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Fee_Sats)
       and Fee_Sats <= Collateral_Sats;

   --  #12: D_next = D_accr + CashOut + FeeDebt - RefiRepayment.
   function Refi_Debt
     (Accrued_Debt_Cents : Amount;
      Cash_Out_Cents     : Amount;
      Fee_Debt_Cents     : Amount;
      Refi_Repayment     : Amount) return Amount
   is
     (Accrued_Debt_Cents + Cash_Out_Cents + Fee_Debt_Cents
      - Refi_Repayment)
   with
     Pre =>
       Nonnegative (Accrued_Debt_Cents)
       and Nonnegative (Cash_Out_Cents)
       and Nonnegative (Fee_Debt_Cents)
       and Nonnegative (Refi_Repayment)
       and Refi_Repayment <=
         Accrued_Debt_Cents + Cash_Out_Cents + Fee_Debt_Cents;

   function Top_Up_Collateral
     (Collateral_Sats : Amount;
      Top_Up_Sats     : Amount) return Amount
   is (Collateral_Sats + Top_Up_Sats)
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Top_Up_Sats);

   function Target_Shortfall
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Target_Num      : Ratio_Component;
      Target_Den      : Ratio_Component) return Amount
   is
     (Debt_Cents * SAT * Target_Den
      - Target_Num * Collateral_Sats * Price_Cents)
   with
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Target_Num)
       and Positive (Target_Den);

   function Remaining_Collateral
     (Collateral_Sats : Amount;
      Liquidated_Sats : Amount) return Amount
   is (Collateral_Sats - Liquidated_Sats)
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Liquidated_Sats)
       and Liquidated_Sats <= Collateral_Sats;

   --  #12:
   --    D_liq_scaled = D_accr * B * Recovery_Den
   --                   - q * S * Recovery_Num.
   function Debt_After_Partial_Liquidation_Scaled
     (Accrued_Debt_Cents : Amount;
      Liquidated_Sats    : Amount;
      Price_Cents        : Price;
      Recovery_Num       : Ratio_Component;
      Recovery_Den       : Ratio_Component) return Amount
   is
     (Accrued_Debt_Cents * SAT * Recovery_Den
      - Liquidated_Sats * Price_Cents * Recovery_Num)
   with
     Pre =>
       Nonnegative (Accrued_Debt_Cents)
       and Nonnegative (Liquidated_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Recovery_Num)
       and Positive (Recovery_Den)
       and Accrued_Debt_Cents * SAT * Recovery_Den >=
         Liquidated_Sats * Price_Cents * Recovery_Num;

   function Target_LTV_Holds_Scaled
     (Debt_Scaled     : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Target_Num      : Ratio_Component;
      Target_Den      : Ratio_Component;
      Recovery_Den    : Ratio_Component) return Boolean
   is
     (Debt_Scaled * Target_Den
      = Target_Num * Collateral_Sats * Price_Cents * Recovery_Den)
   with
     Pre =>
       Nonnegative (Debt_Scaled)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Target_Num)
       and Positive (Target_Den)
       and Positive (Recovery_Den);

   function Liquidation_Size_Equation
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Price_Cents        : Price;
      Liquidated_Sats    : Amount;
      Target_Num         : Ratio_Component;
      Target_Den         : Ratio_Component;
      Recovery_Num       : Ratio_Component;
      Recovery_Den       : Ratio_Component) return Boolean
   is
     (Accrued_Debt_Cents * SAT * Recovery_Den * Target_Den
      - Target_Num * Collateral_Sats * Price_Cents * Recovery_Den
      =
      Liquidated_Sats * Price_Cents *
        (Recovery_Num * Target_Den - Target_Num * Recovery_Den))
   with
     Pre =>
       Nonnegative (Accrued_Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Liquidated_Sats)
       and Nonnegative (Target_Num)
       and Positive (Target_Den)
       and Nonnegative (Recovery_Num)
       and Positive (Recovery_Den)
       and Recovery_Num * Target_Den > Target_Num * Recovery_Den
       and Accrued_Debt_Cents * SAT * Recovery_Den * Target_Den >=
         Target_Num * Collateral_Sats * Price_Cents * Recovery_Den;

   function Debt_Den_After_Partial_Liquidation
     (Recovery_Den : Ratio_Component) return Amount
   is (SAT * Recovery_Den)
   with
     Pre => Positive (Recovery_Den);

   --  #12: DebtClaimBTC = ceil(D_accr * B / S).
   function Valid_Debt_Claim_Ceil
     (Accrued_Debt_Cents : Amount;
      Price_Cents        : Price;
      Debt_Claim_Sats    : Amount) return Boolean
   is
     (Debt_Claim_Sats * Price_Cents
      >= Accrued_Debt_Cents * SAT
      and then
        (Debt_Claim_Sats = 0
         or else
           (Debt_Claim_Sats - 1) * Price_Cents
           < Accrued_Debt_Cents * SAT))
   with
     Pre =>
       Nonnegative (Accrued_Debt_Cents)
       and Positive (Price_Cents)
       and Nonnegative (Debt_Claim_Sats);

   function Lender_BTC
     (Collateral_Sats : Amount;
      Debt_Claim_Sats : Amount) return Amount
   is (Min (Collateral_Sats, Debt_Claim_Sats))
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Debt_Claim_Sats);

   function Borrower_BTC
     (Collateral_Sats : Amount;
      Debt_Claim_Sats : Amount) return Amount
   is (Collateral_Sats - Lender_BTC (Collateral_Sats, Debt_Claim_Sats))
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Debt_Claim_Sats);

   procedure Prove_Debt_Accrual_Nonnegative
     (Debt_Cents      : Amount;
      Interest_Cents  : Amount;
      Repayment_Cents : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Interest_Cents)
       and Nonnegative (Repayment_Cents)
       and Repayment_Cents <= Debt_Cents + Interest_Cents,
     Post =>
       Debt_After_Accrual
         (Debt_Cents, Interest_Cents, Repayment_Cents) >= 0
       and
       Debt_After_Accrual
         (Debt_Cents, Interest_Cents, Repayment_Cents)
       = Debt_Cents + Interest_Cents - Repayment_Cents;

   procedure Prove_Accrual_Without_Repayment_Does_Not_Decrease_Debt
     (Debt_Cents     : Amount;
      Interest_Cents : Amount)
   with
     Global => null,
     Pre => Nonnegative (Debt_Cents) and Nonnegative (Interest_Cents),
     Post =>
       Debt_After_Accrual (Debt_Cents, Interest_Cents, 0)
       >= Debt_Cents;

   procedure Prove_LTV_Cross_Multiply_Definition
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Theta_Num       : Ratio_Component;
      Theta_Den       : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Theta_Num)
       and Positive (Theta_Den),
     Post =>
       LTV_At_Or_Below
         (Debt_Cents, Collateral_Sats, Price_Cents, Theta_Num, Theta_Den)
       =
       (Debt_Cents * SAT * Theta_Den
        <= Theta_Num * Collateral_Sats * Price_Cents)
       and
       LTV_Above
         (Debt_Cents, Collateral_Sats, Price_Cents, Theta_Num, Theta_Den)
       =
       (Debt_Cents * SAT * Theta_Den
        > Theta_Num * Collateral_Sats * Price_Cents);

   procedure Prove_LTV_Monotone_Threshold
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      A_Num           : Ratio_Component;
      A_Den           : Ratio_Component;
      B_Num           : Ratio_Component;
      B_Den           : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Debt_Cents)
       and then Nonnegative (Collateral_Sats)
       and then Positive (Price_Cents)
       and then Nonnegative (A_Num)
       and then Positive (A_Den)
       and then Nonnegative (B_Num)
       and then Positive (B_Den)
       and then Ratio_LE (A_Num, A_Den, B_Num, B_Den)
       and then LTV_At_Or_Below
         (Debt_Cents, Collateral_Sats, Price_Cents, A_Num, A_Den),
     Post =>
       LTV_At_Or_Below
         (Debt_Cents, Collateral_Sats, Price_Cents, B_Num, B_Den);

   procedure Prove_Branch_Disjointness
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Roll_Num        : Ratio_Component;
      Roll_Den        : Ratio_Component;
      Call_Num        : Ratio_Component;
      Call_Den        : Ratio_Component;
      Liq_Num         : Ratio_Component;
      Liq_Den         : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Debt_Cents)
       and then Nonnegative (Collateral_Sats)
       and then Positive (Price_Cents)
       and then Nonnegative (Roll_Num)
       and then Positive (Roll_Den)
       and then Nonnegative (Call_Num)
       and then Positive (Call_Den)
       and then Nonnegative (Liq_Num)
       and then Positive (Liq_Den)
       and then Ratio_LE (Roll_Num, Roll_Den, Call_Num, Call_Den)
       and then Ratio_LE (Call_Num, Call_Den, Liq_Num, Liq_Den),
     Post =>
       not
         (Healthy
            (Debt_Cents, Collateral_Sats, Price_Cents, Roll_Num, Roll_Den)
          and Watch
            (Debt_Cents,
             Collateral_Sats,
             Price_Cents,
             Roll_Num,
             Roll_Den,
             Call_Num,
             Call_Den))
       and not
         (Healthy
            (Debt_Cents, Collateral_Sats, Price_Cents, Roll_Num, Roll_Den)
          and Margin_Call
            (Debt_Cents,
             Collateral_Sats,
             Price_Cents,
             Call_Num,
             Call_Den,
             Liq_Num,
             Liq_Den))
       and not
         (Healthy
            (Debt_Cents, Collateral_Sats, Price_Cents, Roll_Num, Roll_Den)
          and Liquidation
            (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den))
       and not
         (Watch
            (Debt_Cents,
             Collateral_Sats,
             Price_Cents,
             Roll_Num,
             Roll_Den,
             Call_Num,
             Call_Den)
          and Margin_Call
            (Debt_Cents,
             Collateral_Sats,
             Price_Cents,
             Call_Num,
             Call_Den,
             Liq_Num,
             Liq_Den))
       and not
         (Watch
            (Debt_Cents,
             Collateral_Sats,
             Price_Cents,
             Roll_Num,
             Roll_Den,
             Call_Num,
             Call_Den)
          and Liquidation
            (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den))
       and not
         (Margin_Call
            (Debt_Cents,
             Collateral_Sats,
             Price_Cents,
             Call_Num,
             Call_Den,
             Liq_Num,
             Liq_Den)
          and Liquidation
            (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den));

   procedure Prove_Branch_Coverage
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Roll_Num        : Ratio_Component;
      Roll_Den        : Ratio_Component;
      Call_Num        : Ratio_Component;
      Call_Den        : Ratio_Component;
      Liq_Num         : Ratio_Component;
      Liq_Den         : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Roll_Num)
       and Positive (Roll_Den)
       and Nonnegative (Call_Num)
       and Positive (Call_Den)
       and Nonnegative (Liq_Num)
       and Positive (Liq_Den),
     Post =>
       Healthy
         (Debt_Cents, Collateral_Sats, Price_Cents, Roll_Num, Roll_Den)
       or Watch
         (Debt_Cents,
          Collateral_Sats,
          Price_Cents,
          Roll_Num,
          Roll_Den,
          Call_Num,
          Call_Den)
       or Margin_Call
         (Debt_Cents,
          Collateral_Sats,
          Price_Cents,
          Call_Num,
          Call_Den,
          Liq_Num,
          Liq_Den)
       or Liquidation
         (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den);

   procedure Prove_Healthy_Roll_And_Refi
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Fee_Sats           : Amount;
      Cash_Out_Cents     : Amount;
      Fee_Debt_Cents     : Amount;
      Refi_Repayment     : Amount;
      Price_Cents        : Price;
      Child_Num          : Ratio_Component;
      Child_Den          : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Accrued_Debt_Cents)
       and then Nonnegative (Collateral_Sats)
       and then Nonnegative (Fee_Sats)
       and then Fee_Sats <= Collateral_Sats
       and then Nonnegative (Cash_Out_Cents)
       and then Nonnegative (Fee_Debt_Cents)
       and then Nonnegative (Refi_Repayment)
       and then Refi_Repayment <=
         Accrued_Debt_Cents + Cash_Out_Cents + Fee_Debt_Cents
       and then Positive (Price_Cents)
       and then Nonnegative (Child_Num)
       and then Positive (Child_Den)
       and then LTV_At_Or_Below
         (Refi_Debt
            (Accrued_Debt_Cents,
             Cash_Out_Cents,
             Fee_Debt_Cents,
             Refi_Repayment),
          Refi_Collateral (Collateral_Sats, Fee_Sats),
          Price_Cents,
          Child_Num,
          Child_Den),
     Post =>
       Refi_Collateral (Collateral_Sats, Fee_Sats) >= 0
       and Refi_Debt
         (Accrued_Debt_Cents,
          Cash_Out_Cents,
          Fee_Debt_Cents,
          Refi_Repayment) >= 0
       and Refi_Collateral (Collateral_Sats, Fee_Sats) + Fee_Sats
         = Collateral_Sats
       and
       (if Fee_Sats = 0
        then Refi_Collateral (Collateral_Sats, Fee_Sats) = Collateral_Sats)
       and LTV_At_Or_Below
         (Refi_Debt
            (Accrued_Debt_Cents,
             Cash_Out_Cents,
             Fee_Debt_Cents,
             Refi_Repayment),
          Refi_Collateral (Collateral_Sats, Fee_Sats),
          Price_Cents,
          Child_Num,
          Child_Den);

   procedure Prove_Top_Up_Restores_Target
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Top_Up_Sats        : Amount;
      Price_Cents        : Price;
      Target_Num         : Ratio_Component;
      Target_Den         : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Accrued_Debt_Cents)
       and then Nonnegative (Collateral_Sats)
       and then Nonnegative (Top_Up_Sats)
       and then Positive (Price_Cents)
       and then Nonnegative (Target_Num)
       and then Positive (Target_Den)
       and then Target_Shortfall
         (Accrued_Debt_Cents,
          Collateral_Sats,
          Price_Cents,
          Target_Num,
          Target_Den) > 0
       and then Target_Num * Top_Up_Sats * Price_Cents >=
         Target_Shortfall
           (Accrued_Debt_Cents,
            Collateral_Sats,
            Price_Cents,
            Target_Num,
            Target_Den),
     Post =>
       LTV_At_Or_Below
         (Accrued_Debt_Cents,
          Top_Up_Collateral (Collateral_Sats, Top_Up_Sats),
          Price_Cents,
          Target_Num,
          Target_Den);

   procedure Prove_Partial_Liquidation_Deleverages
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Price_Cents        : Price;
      Liquidated_Sats    : Amount;
      Recovery_Num       : Ratio_Component;
      Recovery_Den       : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Accrued_Debt_Cents)
       and then Nonnegative (Collateral_Sats)
       and then Positive (Price_Cents)
       and then Nonnegative (Liquidated_Sats)
       and then Liquidated_Sats <= Collateral_Sats
       and then Nonnegative (Recovery_Num)
       and then Positive (Recovery_Den)
       and then Accrued_Debt_Cents * SAT * Recovery_Den >=
         Liquidated_Sats * Price_Cents * Recovery_Num,
     Post =>
       Remaining_Collateral (Collateral_Sats, Liquidated_Sats)
       + Liquidated_Sats = Collateral_Sats
       and Remaining_Collateral (Collateral_Sats, Liquidated_Sats)
         <= Collateral_Sats
       and Debt_After_Partial_Liquidation_Scaled
         (Accrued_Debt_Cents,
          Liquidated_Sats,
          Price_Cents,
          Recovery_Num,
          Recovery_Den)
         <= Accrued_Debt_Cents * SAT * Recovery_Den;

   procedure Prove_Exact_Partial_Liquidation_Reaches_Target
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Price_Cents        : Price;
      Liquidated_Sats    : Amount;
      Target_Num         : Ratio_Component;
      Target_Den         : Ratio_Component;
      Recovery_Num       : Ratio_Component;
      Recovery_Den       : Ratio_Component)
   with
     Global => null,
     Pre =>
       (Nonnegative (Accrued_Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Liquidated_Sats)
       and Liquidated_Sats <= Collateral_Sats
       and Nonnegative (Target_Num)
       and Positive (Target_Den)
       and Nonnegative (Recovery_Num)
       and Positive (Recovery_Den)
       and Recovery_Num * Target_Den > Target_Num * Recovery_Den
       and Accrued_Debt_Cents * SAT * Recovery_Den >=
         Liquidated_Sats * Price_Cents * Recovery_Num
       and Accrued_Debt_Cents * SAT * Recovery_Den * Target_Den >=
         Target_Num * Collateral_Sats * Price_Cents * Recovery_Den)
       and then Liquidation_Size_Equation
         (Accrued_Debt_Cents,
          Collateral_Sats,
          Price_Cents,
          Liquidated_Sats,
          Target_Num,
          Target_Den,
          Recovery_Num,
          Recovery_Den),
     Post =>
       Target_LTV_Holds_Scaled
         (Debt_After_Partial_Liquidation_Scaled
            (Accrued_Debt_Cents,
             Liquidated_Sats,
             Price_Cents,
             Recovery_Num,
             Recovery_Den),
          Remaining_Collateral (Collateral_Sats, Liquidated_Sats),
          Price_Cents,
          Target_Num,
          Target_Den,
          Recovery_Den);

   procedure Prove_Full_Liquidation_Waterfall
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Price_Cents        : Price;
      Debt_Claim_Sats    : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Accrued_Debt_Cents)
       and then Nonnegative (Collateral_Sats)
       and then Positive (Price_Cents)
       and then Nonnegative (Debt_Claim_Sats)
       and then Valid_Debt_Claim_Ceil
         (Accrued_Debt_Cents, Price_Cents, Debt_Claim_Sats),
     Post =>
       Lender_BTC (Collateral_Sats, Debt_Claim_Sats) >= 0
       and Lender_BTC (Collateral_Sats, Debt_Claim_Sats)
         <= Collateral_Sats
       and Borrower_BTC (Collateral_Sats, Debt_Claim_Sats) >= 0
       and Borrower_BTC (Collateral_Sats, Debt_Claim_Sats)
         <= Collateral_Sats
       and Lender_BTC (Collateral_Sats, Debt_Claim_Sats)
         + Borrower_BTC (Collateral_Sats, Debt_Claim_Sats)
         = Collateral_Sats;

   procedure Prove_Residual_Roll_Carries_Scaled_Debt
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Price_Cents        : Price;
      Liquidated_Sats    : Amount;
      Target_Num         : Ratio_Component;
      Target_Den         : Ratio_Component;
      Recovery_Num       : Ratio_Component;
      Recovery_Den       : Ratio_Component)
   with
     Global => null,
     Pre =>
       (Nonnegative (Accrued_Debt_Cents)
       and Nonnegative (Collateral_Sats)
       and Positive (Price_Cents)
       and Nonnegative (Liquidated_Sats)
       and Liquidated_Sats <= Collateral_Sats
       and Nonnegative (Target_Num)
       and Positive (Target_Den)
       and Nonnegative (Recovery_Num)
       and Positive (Recovery_Den)
       and Recovery_Num * Target_Den > Target_Num * Recovery_Den
       and Accrued_Debt_Cents * SAT * Recovery_Den >=
         Liquidated_Sats * Price_Cents * Recovery_Num
       and Accrued_Debt_Cents * SAT * Recovery_Den * Target_Den >=
         Target_Num * Collateral_Sats * Price_Cents * Recovery_Den)
       and then Liquidation_Size_Equation
         (Accrued_Debt_Cents,
          Collateral_Sats,
          Price_Cents,
          Liquidated_Sats,
          Target_Num,
          Target_Den,
          Recovery_Num,
          Recovery_Den),
     Post =>
       Debt_Den_After_Partial_Liquidation (Recovery_Den)
       = SAT * Recovery_Den
       and Target_LTV_Holds_Scaled
         (Debt_After_Partial_Liquidation_Scaled
            (Accrued_Debt_Cents,
             Liquidated_Sats,
             Price_Cents,
             Recovery_Num,
             Recovery_Den),
          Remaining_Collateral (Collateral_Sats, Liquidated_Sats),
          Price_Cents,
          Target_Num,
          Target_Den,
          Recovery_Den);
end Btc_Loan_Lifecycle_Algebra;
