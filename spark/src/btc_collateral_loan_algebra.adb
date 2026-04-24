pragma SPARK_Mode (On);

package body Btc_Collateral_Loan_Algebra is
   procedure Prove_LTV_Cross_Multiply_Definition
     (Debt_USD       : Amount;
      Collateral_BTC : Amount;
      Price_USD      : Amount;
      LTV_Num        : Ratio_Component;
      LTV_Den        : Ratio_Component) is
   begin
      pragma Assert
        (LTV_At_Or_Below
           (Debt_USD, Collateral_BTC, Price_USD, LTV_Num, LTV_Den)
         =
         (Debt_USD * LTV_Den <=
            LTV_Num * Collateral_BTC * Price_USD));
   end Prove_LTV_Cross_Multiply_Definition;

   procedure Prove_Roll_Updates_Debt_And_Preserves_Collateral
     (Debt_USD        : Amount;
      Interest_USD    : Amount;
      Repayment_USD   : Amount;
      Collateral_BTC  : Amount) is
   begin
      pragma Assert (Rolled_Collateral (Collateral_BTC) = Collateral_BTC);
      pragma Assert
        (Debt_After_Period (Debt_USD, Interest_USD, Repayment_USD)
         = Debt_USD + Interest_USD - Repayment_USD);
   end Prove_Roll_Updates_Debt_And_Preserves_Collateral;

   procedure Prove_Accrual_Without_Repayment_Does_Not_Decrease_Debt
     (Debt_USD     : Amount;
      Interest_USD : Amount) is
   begin
      pragma Assert (Interest_USD >= 0);
      pragma Assert
        (Debt_After_Period (Debt_USD, Interest_USD, 0)
         = Debt_USD + Interest_USD);
      pragma Assert
        (Debt_After_Period (Debt_USD, Interest_USD, 0) >= Debt_USD);
   end Prove_Accrual_Without_Repayment_Does_Not_Decrease_Debt;

   procedure Prove_Terminal_Waterfall_Conserves_BTC
     (Collateral_BTC : Amount;
      Debt_Claim_BTC : Amount) is
      Lender   : constant Amount :=
        Terminal_Lender_Claim (Collateral_BTC, Debt_Claim_BTC);
      Borrower : constant Amount :=
        Terminal_Borrower_Residual (Collateral_BTC, Debt_Claim_BTC);
   begin
      if Debt_Claim_BTC <= Collateral_BTC then
         pragma Assert (Lender = Debt_Claim_BTC);
         pragma Assert (Borrower = Collateral_BTC - Debt_Claim_BTC);
         pragma Assert (Lender + Borrower = Collateral_BTC);
      else
         pragma Assert (Lender = Collateral_BTC);
         pragma Assert (Borrower = 0);
         pragma Assert (Lender + Borrower = Collateral_BTC);
      end if;

      pragma Assert (Lender <= Collateral_BTC);
      pragma Assert (Borrower >= 0);
      pragma Assert
        (Terminal_Lender_Claim (Collateral_BTC, Debt_Claim_BTC)
         + Terminal_Borrower_Residual (Collateral_BTC, Debt_Claim_BTC)
         = Collateral_BTC);
   end Prove_Terminal_Waterfall_Conserves_BTC;

   procedure Prove_Partial_Liquidation_Deleverages
     (Debt_USD       : Amount;
      Collateral_BTC : Amount;
      Price_USD      : Amount;
      Liquidated_BTC : Amount;
      Recovery_Num   : Ratio_Component;
      Recovery_Den   : Ratio_Component) is
      Debt_Scaled : constant Amount :=
        Debt_After_Liquidation_Scaled
          (Debt_USD,
           Liquidated_BTC,
           Price_USD,
           Recovery_Num,
           Recovery_Den);
      Remaining : constant Amount :=
        Remaining_Collateral (Collateral_BTC, Liquidated_BTC);
   begin
      pragma Assert (Remaining = Collateral_BTC - Liquidated_BTC);
      pragma Assert (Remaining <= Collateral_BTC);
      pragma Assert
        (Debt_Scaled =
           Debt_USD * Recovery_Den
           - Liquidated_BTC * Price_USD * Recovery_Num);
      pragma Assert (Liquidated_BTC * Price_USD * Recovery_Num >= 0);
      pragma Assert (Debt_Scaled <= Debt_USD * Recovery_Den);
   end Prove_Partial_Liquidation_Deleverages;

   procedure Prove_Exact_Partial_Liquidation_Reaches_Target_LTV
     (Debt_USD       : Amount;
      Collateral_BTC : Amount;
      Price_USD      : Amount;
      Liquidated_BTC : Amount;
      Target_Num     : Ratio_Component;
      Target_Den     : Ratio_Component;
      Recovery_Num   : Ratio_Component;
      Recovery_Den   : Ratio_Component) is
      Debt_Scaled : constant Amount :=
        Debt_After_Liquidation_Scaled
          (Debt_USD,
           Liquidated_BTC,
           Price_USD,
           Recovery_Num,
           Recovery_Den);
      Remaining : constant Amount :=
        Remaining_Collateral (Collateral_BTC, Liquidated_BTC);
      Left_Start : constant Amount :=
        Debt_USD * Recovery_Den * Target_Den
        - Liquidated_BTC * Price_USD * Recovery_Num * Target_Den;
      Right_Target : constant Amount :=
        Target_Num * Remaining * Price_USD * Recovery_Den;
   begin
      pragma Assert
        (Debt_Scaled =
           Debt_USD * Recovery_Den
           - Liquidated_BTC * Price_USD * Recovery_Num);
      pragma Assert (Remaining = Collateral_BTC - Liquidated_BTC);

      pragma Assert
        (Debt_Scaled * Target_Den =
           Debt_USD * Recovery_Den * Target_Den
           - Liquidated_BTC * Price_USD * Recovery_Num * Target_Den);

      pragma Assert
        (Debt_USD * Recovery_Den * Target_Den
         - Target_Num * Collateral_BTC * Price_USD * Recovery_Den
         =
         Liquidated_BTC * Price_USD *
           (Recovery_Num * Target_Den - Target_Num * Recovery_Den));

      pragma Assert
        (Liquidated_BTC * Price_USD *
           (Recovery_Num * Target_Den - Target_Num * Recovery_Den)
         =
         Liquidated_BTC * Price_USD * Recovery_Num * Target_Den
         - Liquidated_BTC * Price_USD * Target_Num * Recovery_Den);

      pragma Assert
        (Debt_USD * Recovery_Den * Target_Den
         - Liquidated_BTC * Price_USD * Recovery_Num * Target_Den
         =
         Target_Num * Collateral_BTC * Price_USD * Recovery_Den
         - Liquidated_BTC * Price_USD * Target_Num * Recovery_Den);

      pragma Assert
        (Target_Num * Collateral_BTC * Price_USD * Recovery_Den
         - Liquidated_BTC * Price_USD * Target_Num * Recovery_Den
         =
         Target_Num * (Collateral_BTC - Liquidated_BTC) *
           Price_USD * Recovery_Den);

      pragma Assert (Left_Start = Right_Target);
      pragma Assert (Debt_Scaled * Target_Den = Right_Target);
      pragma Assert
        (Target_LTV_Holds_Scaled
           (Debt_Scaled,
            Remaining,
            Price_USD,
            Target_Num,
            Target_Den,
            Recovery_Den));
   end Prove_Exact_Partial_Liquidation_Reaches_Target_LTV;
end Btc_Collateral_Loan_Algebra;
