pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Btc_Collateral_Loan_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Ratio_Component is Valid_Big_Integer;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);

   function Collateral_Value
     (Collateral_BTC : Amount;
      Price_USD      : Amount) return Amount
   is (Collateral_BTC * Price_USD)
   with
     Pre => Nonnegative (Collateral_BTC) and Nonnegative (Price_USD);

   --  Cross-multiplied LTV test:
   --    Debt / (Collateral_BTC * Price_USD) <= LTV_Num / LTV_Den
   --  is represented without division as:
   --    Debt * LTV_Den <= LTV_Num * Collateral_BTC * Price_USD.
   function LTV_At_Or_Below
     (Debt_USD       : Amount;
      Collateral_BTC : Amount;
      Price_USD      : Amount;
      LTV_Num        : Ratio_Component;
      LTV_Den        : Ratio_Component) return Boolean
   is
     (Debt_USD * LTV_Den <= LTV_Num * Collateral_BTC * Price_USD)
   with
     Pre =>
       Nonnegative (Debt_USD)
       and Nonnegative (Collateral_BTC)
       and Positive (Price_USD)
       and Nonnegative (LTV_Num)
       and Positive (LTV_Den);

   function Debt_After_Period
     (Debt_USD        : Amount;
      Interest_USD    : Amount;
      Repayment_USD   : Amount) return Amount
   is (Debt_USD + Interest_USD - Repayment_USD)
   with
     Pre =>
       Nonnegative (Debt_USD)
       and Nonnegative (Interest_USD)
       and Nonnegative (Repayment_USD)
       and Repayment_USD <= Debt_USD + Interest_USD;

   function Rolled_Collateral
     (Collateral_BTC : Amount) return Amount
   is (Collateral_BTC)
   with
     Pre => Nonnegative (Collateral_BTC);

   --  Terminal default waterfall expressed in BTC.
   --  Debt_Claim_BTC is the USD claim converted into BTC by the oracle price
   --  and any agreed penalty/haircut rule. The lender receives the lesser of
   --  that claim and the posted collateral; the borrower receives the residual.
   function Terminal_Lender_Claim
     (Collateral_BTC : Amount;
      Debt_Claim_BTC : Amount) return Amount
   is
     (if Debt_Claim_BTC <= Collateral_BTC
      then Debt_Claim_BTC
      else Collateral_BTC)
   with
     Pre => Nonnegative (Collateral_BTC) and Nonnegative (Debt_Claim_BTC);

   function Terminal_Borrower_Residual
     (Collateral_BTC : Amount;
      Debt_Claim_BTC : Amount) return Amount
   is
     (Collateral_BTC -
        Terminal_Lender_Claim (Collateral_BTC, Debt_Claim_BTC))
   with
     Pre => Nonnegative (Collateral_BTC) and Nonnegative (Debt_Claim_BTC);

   function Remaining_Collateral
     (Collateral_BTC : Amount;
      Liquidated_BTC : Amount) return Amount
   is (Collateral_BTC - Liquidated_BTC)
   with
     Pre =>
       Nonnegative (Collateral_BTC)
       and Nonnegative (Liquidated_BTC)
       and Liquidated_BTC <= Collateral_BTC;

   --  Partial liquidation under recovery value
   --    Recovery = Recovery_Num / Recovery_Den.
   --  To avoid fractional debt, the post-liquidation debt is represented as
   --    Debt_Scaled = Debt_USD * Recovery_Den
   --                  - Liquidated_BTC * Price_USD * Recovery_Num.
   --  The actual debt is Debt_Scaled / Recovery_Den.
   function Debt_After_Liquidation_Scaled
     (Debt_USD       : Amount;
      Liquidated_BTC : Amount;
      Price_USD      : Amount;
      Recovery_Num   : Ratio_Component;
      Recovery_Den   : Ratio_Component) return Amount
   is
     (Debt_USD * Recovery_Den
      - Liquidated_BTC * Price_USD * Recovery_Num)
   with
     Pre =>
       Nonnegative (Debt_USD)
       and Nonnegative (Liquidated_BTC)
       and Positive (Price_USD)
       and Nonnegative (Recovery_Num)
       and Positive (Recovery_Den)
       and Debt_USD * Recovery_Den >=
         Liquidated_BTC * Price_USD * Recovery_Num;

   --  Cross-multiplied target LTV after partial liquidation:
   --    (Debt_Scaled / Recovery_Den) / (Remaining_BTC * Price_USD)
   --       = Target_Num / Target_Den
   --  represented as:
   --    Debt_Scaled * Target_Den
   --       = Target_Num * Remaining_BTC * Price_USD * Recovery_Den.
   function Target_LTV_Holds_Scaled
     (Debt_Scaled    : Amount;
      Remaining_BTC  : Amount;
      Price_USD      : Amount;
      Target_Num     : Ratio_Component;
      Target_Den     : Ratio_Component;
      Recovery_Den   : Ratio_Component) return Boolean
   is
     (Debt_Scaled * Target_Den =
        Target_Num * Remaining_BTC * Price_USD * Recovery_Den)
   with
     Pre =>
       Nonnegative (Debt_Scaled)
       and Nonnegative (Remaining_BTC)
       and Positive (Price_USD)
       and Nonnegative (Target_Num)
       and Positive (Target_Den)
       and Positive (Recovery_Den);

   --  Exact liquidation-sizing equation derived from:
   --    (D - q*S*Recovery) / ((Q - q)*S) = Target.
   --  With Recovery = Recovery_Num / Recovery_Den and
   --  Target = Target_Num / Target_Den, exact q satisfies:
   --    D*Recovery_Den*Target_Den
   --      - Target_Num*Q*S*Recovery_Den
   --    =
   --    q*S*(Recovery_Num*Target_Den - Target_Num*Recovery_Den).
   function Liquidation_Size_Equation
     (Debt_USD       : Amount;
      Collateral_BTC : Amount;
      Price_USD      : Amount;
      Liquidated_BTC : Amount;
      Target_Num     : Ratio_Component;
      Target_Den     : Ratio_Component;
      Recovery_Num   : Ratio_Component;
      Recovery_Den   : Ratio_Component) return Boolean
   is
     (Debt_USD * Recovery_Den * Target_Den
      - Target_Num * Collateral_BTC * Price_USD * Recovery_Den
      =
      Liquidated_BTC * Price_USD *
        (Recovery_Num * Target_Den - Target_Num * Recovery_Den))
   with
     Pre =>
       Nonnegative (Debt_USD)
       and Nonnegative (Collateral_BTC)
       and Positive (Price_USD)
       and Nonnegative (Liquidated_BTC)
       and Nonnegative (Target_Num)
       and Positive (Target_Den)
       and Nonnegative (Recovery_Num)
       and Positive (Recovery_Den)
       and Recovery_Num * Target_Den > Target_Num * Recovery_Den
       and Debt_USD * Recovery_Den * Target_Den >=
         Target_Num * Collateral_BTC * Price_USD * Recovery_Den;

   procedure Prove_LTV_Cross_Multiply_Definition
     (Debt_USD       : Amount;
      Collateral_BTC : Amount;
      Price_USD      : Amount;
      LTV_Num        : Ratio_Component;
      LTV_Den        : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Debt_USD)
       and Nonnegative (Collateral_BTC)
       and Positive (Price_USD)
       and Nonnegative (LTV_Num)
       and Positive (LTV_Den),
     Post =>
       LTV_At_Or_Below
         (Debt_USD, Collateral_BTC, Price_USD, LTV_Num, LTV_Den)
       =
       (Debt_USD * LTV_Den <=
          LTV_Num * Collateral_BTC * Price_USD);

   procedure Prove_Roll_Updates_Debt_And_Preserves_Collateral
     (Debt_USD        : Amount;
      Interest_USD    : Amount;
      Repayment_USD   : Amount;
      Collateral_BTC  : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Debt_USD)
       and Nonnegative (Interest_USD)
       and Nonnegative (Repayment_USD)
       and Repayment_USD <= Debt_USD + Interest_USD
       and Nonnegative (Collateral_BTC),
     Post =>
       Rolled_Collateral (Collateral_BTC) = Collateral_BTC
       and Debt_After_Period (Debt_USD, Interest_USD, Repayment_USD)
         = Debt_USD + Interest_USD - Repayment_USD;

   procedure Prove_Accrual_Without_Repayment_Does_Not_Decrease_Debt
     (Debt_USD     : Amount;
      Interest_USD : Amount)
   with
     Global => null,
     Pre => Nonnegative (Debt_USD) and Nonnegative (Interest_USD),
     Post => Debt_After_Period (Debt_USD, Interest_USD, 0) >= Debt_USD;

   procedure Prove_Terminal_Waterfall_Conserves_BTC
     (Collateral_BTC : Amount;
      Debt_Claim_BTC : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral_BTC) and Nonnegative (Debt_Claim_BTC),
     Post =>
       Terminal_Lender_Claim (Collateral_BTC, Debt_Claim_BTC)
       + Terminal_Borrower_Residual (Collateral_BTC, Debt_Claim_BTC)
       = Collateral_BTC
       and Terminal_Lender_Claim (Collateral_BTC, Debt_Claim_BTC)
         <= Collateral_BTC
       and Terminal_Borrower_Residual (Collateral_BTC, Debt_Claim_BTC) >= 0;

   procedure Prove_Partial_Liquidation_Deleverages
     (Debt_USD       : Amount;
      Collateral_BTC : Amount;
      Price_USD      : Amount;
      Liquidated_BTC : Amount;
      Recovery_Num   : Ratio_Component;
      Recovery_Den   : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Debt_USD)
       and Nonnegative (Collateral_BTC)
       and Positive (Price_USD)
       and Nonnegative (Liquidated_BTC)
       and Liquidated_BTC <= Collateral_BTC
       and Nonnegative (Recovery_Num)
       and Positive (Recovery_Den)
       and Debt_USD * Recovery_Den >=
         Liquidated_BTC * Price_USD * Recovery_Num,
     Post =>
       Remaining_Collateral (Collateral_BTC, Liquidated_BTC)
         <= Collateral_BTC
       and
       Debt_After_Liquidation_Scaled
         (Debt_USD, Liquidated_BTC, Price_USD, Recovery_Num, Recovery_Den)
         <= Debt_USD * Recovery_Den;

   procedure Prove_Exact_Partial_Liquidation_Reaches_Target_LTV
     (Debt_USD       : Amount;
      Collateral_BTC : Amount;
      Price_USD      : Amount;
      Liquidated_BTC : Amount;
      Target_Num     : Ratio_Component;
      Target_Den     : Ratio_Component;
      Recovery_Num   : Ratio_Component;
      Recovery_Den   : Ratio_Component)
   with
     Global => null,
     Pre =>
       (Nonnegative (Debt_USD)
       and Nonnegative (Collateral_BTC)
       and Positive (Price_USD)
       and Nonnegative (Liquidated_BTC)
       and Liquidated_BTC <= Collateral_BTC
       and Nonnegative (Target_Num)
       and Positive (Target_Den)
       and Nonnegative (Recovery_Num)
       and Positive (Recovery_Den)
       and Recovery_Num * Target_Den > Target_Num * Recovery_Den
       and Debt_USD * Recovery_Den >=
         Liquidated_BTC * Price_USD * Recovery_Num
       and Debt_USD * Recovery_Den * Target_Den >=
         Target_Num * Collateral_BTC * Price_USD * Recovery_Den)
       and then Liquidation_Size_Equation
         (Debt_USD,
          Collateral_BTC,
          Price_USD,
          Liquidated_BTC,
          Target_Num,
          Target_Den,
          Recovery_Num,
          Recovery_Den),
     Post =>
       Target_LTV_Holds_Scaled
         (Debt_After_Liquidation_Scaled
            (Debt_USD,
             Liquidated_BTC,
             Price_USD,
             Recovery_Num,
             Recovery_Den),
          Remaining_Collateral (Collateral_BTC, Liquidated_BTC),
          Price_USD,
          Target_Num,
          Target_Den,
          Recovery_Den);
end Btc_Collateral_Loan_Algebra;
