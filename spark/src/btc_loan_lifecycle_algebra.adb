pragma SPARK_Mode (On);

package body Btc_Loan_Lifecycle_Algebra is
   procedure Prove_Debt_Accrual_Nonnegative
     (Debt_Cents      : Amount;
      Interest_Cents  : Amount;
      Repayment_Cents : Amount) is
      Accrued : constant Amount :=
        Debt_After_Accrual (Debt_Cents, Interest_Cents, Repayment_Cents);
   begin
      pragma Assert (Accrued = Debt_Cents + Interest_Cents - Repayment_Cents);
      pragma Assert (Debt_Cents + Interest_Cents - Repayment_Cents >= 0);
      pragma Assert (Accrued >= 0);
   end Prove_Debt_Accrual_Nonnegative;

   procedure Prove_Accrual_Without_Repayment_Does_Not_Decrease_Debt
     (Debt_Cents     : Amount;
      Interest_Cents : Amount) is
      Accrued : constant Amount :=
        Debt_After_Accrual (Debt_Cents, Interest_Cents, 0);
   begin
      pragma Assert (Accrued = Debt_Cents + Interest_Cents);
      pragma Assert (Interest_Cents >= 0);
      pragma Assert (Accrued >= Debt_Cents);
   end Prove_Accrual_Without_Repayment_Does_Not_Decrease_Debt;

   procedure Prove_LTV_Cross_Multiply_Definition
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Theta_Num       : Ratio_Component;
      Theta_Den       : Ratio_Component) is
   begin
      pragma Assert
        (LTV_At_Or_Below
           (Debt_Cents, Collateral_Sats, Price_Cents, Theta_Num, Theta_Den)
         =
         (Debt_Cents * SAT * Theta_Den
          <= Theta_Num * Collateral_Sats * Price_Cents));
      pragma Assert
        (LTV_Above
           (Debt_Cents, Collateral_Sats, Price_Cents, Theta_Num, Theta_Den)
         =
         (Debt_Cents * SAT * Theta_Den
          > Theta_Num * Collateral_Sats * Price_Cents));
   end Prove_LTV_Cross_Multiply_Definition;

   procedure Prove_LTV_Monotone_Threshold
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      A_Num           : Ratio_Component;
      A_Den           : Ratio_Component;
      B_Num           : Ratio_Component;
      B_Den           : Ratio_Component) is
      Scaled_Debt : constant Amount := Debt_Cents * SAT;
      Collateral_Value : constant Amount := Collateral_Sats * Price_Cents;
   begin
      pragma Assert (Scaled_Debt >= 0);
      pragma Assert (Collateral_Value >= 0);
      pragma Assert (Scaled_Debt * A_Den <= A_Num * Collateral_Value);
      pragma Assert (A_Num * B_Den <= B_Num * A_Den);
      pragma Assert
        (Scaled_Debt * A_Den * B_Den
         <= A_Num * Collateral_Value * B_Den);
      pragma Assert
        (A_Num * Collateral_Value * B_Den
         <= B_Num * A_Den * Collateral_Value);
      pragma Assert
        (Scaled_Debt * A_Den * B_Den
         <= B_Num * A_Den * Collateral_Value);
      pragma Assert
        (Scaled_Debt * B_Den * A_Den
         <= B_Num * Collateral_Value * A_Den);
      pragma Assert (Scaled_Debt * B_Den <= B_Num * Collateral_Value);
      pragma Assert
        (LTV_At_Or_Below
           (Debt_Cents, Collateral_Sats, Price_Cents, B_Num, B_Den));
   end Prove_LTV_Monotone_Threshold;

   procedure Prove_Branch_Disjointness
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Roll_Num        : Ratio_Component;
      Roll_Den        : Ratio_Component;
      Call_Num        : Ratio_Component;
      Call_Den        : Ratio_Component;
      Liq_Num         : Ratio_Component;
      Liq_Den         : Ratio_Component) is
   begin
      if Healthy
        (Debt_Cents, Collateral_Sats, Price_Cents, Roll_Num, Roll_Den)
      then
         pragma Assert
           (not Watch
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Roll_Num,
               Roll_Den,
               Call_Num,
               Call_Den));
         Prove_LTV_Monotone_Threshold
           (Debt_Cents,
            Collateral_Sats,
            Price_Cents,
            Roll_Num,
            Roll_Den,
            Call_Num,
            Call_Den);
         pragma Assert
           (not LTV_Above
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Call_Num,
               Call_Den));
         pragma Assert
           (not Margin_Call
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Call_Num,
               Call_Den,
               Liq_Num,
               Liq_Den));
         Prove_LTV_Monotone_Threshold
           (Debt_Cents,
            Collateral_Sats,
            Price_Cents,
            Call_Num,
            Call_Den,
            Liq_Num,
            Liq_Den);
         pragma Assert
           (not LTV_Above
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Liq_Num,
               Liq_Den));
         pragma Assert
           (not Liquidation
              (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den));
      end if;

      if Watch
        (Debt_Cents,
         Collateral_Sats,
         Price_Cents,
         Roll_Num,
         Roll_Den,
         Call_Num,
         Call_Den)
      then
         pragma Assert
           (not Healthy
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Roll_Num,
               Roll_Den));
         pragma Assert
           (not Margin_Call
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Call_Num,
               Call_Den,
               Liq_Num,
               Liq_Den));
         Prove_LTV_Monotone_Threshold
           (Debt_Cents,
            Collateral_Sats,
            Price_Cents,
            Call_Num,
            Call_Den,
            Liq_Num,
            Liq_Den);
         pragma Assert
           (not LTV_Above
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Liq_Num,
               Liq_Den));
         pragma Assert
           (not Liquidation
              (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den));
      end if;

      if Margin_Call
        (Debt_Cents,
         Collateral_Sats,
         Price_Cents,
         Call_Num,
         Call_Den,
         Liq_Num,
         Liq_Den)
      then
         pragma Assert
           (not Watch
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Roll_Num,
               Roll_Den,
               Call_Num,
               Call_Den));
         pragma Assert
           (not Liquidation
              (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den));
      end if;
   end Prove_Branch_Disjointness;

   procedure Prove_Branch_Coverage
     (Debt_Cents      : Amount;
      Collateral_Sats : Amount;
      Price_Cents     : Price;
      Roll_Num        : Ratio_Component;
      Roll_Den        : Ratio_Component;
      Call_Num        : Ratio_Component;
      Call_Den        : Ratio_Component;
      Liq_Num         : Ratio_Component;
      Liq_Den         : Ratio_Component) is
   begin
      if LTV_At_Or_Below
        (Debt_Cents, Collateral_Sats, Price_Cents, Roll_Num, Roll_Den)
      then
         pragma Assert
           (Healthy
              (Debt_Cents, Collateral_Sats, Price_Cents, Roll_Num, Roll_Den));
      elsif LTV_At_Or_Below
        (Debt_Cents, Collateral_Sats, Price_Cents, Call_Num, Call_Den)
      then
         pragma Assert
           (LTV_Above
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Roll_Num,
               Roll_Den));
         pragma Assert
           (Watch
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Roll_Num,
               Roll_Den,
               Call_Num,
               Call_Den));
      elsif LTV_At_Or_Below
        (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den)
      then
         pragma Assert
           (LTV_Above
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Call_Num,
               Call_Den));
         pragma Assert
           (Margin_Call
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Call_Num,
               Call_Den,
               Liq_Num,
               Liq_Den));
      else
         pragma Assert
           (LTV_Above
              (Debt_Cents,
               Collateral_Sats,
               Price_Cents,
               Liq_Num,
               Liq_Den));
         pragma Assert
           (Liquidation
              (Debt_Cents, Collateral_Sats, Price_Cents, Liq_Num, Liq_Den));
      end if;
   end Prove_Branch_Coverage;

   procedure Prove_Healthy_Roll_And_Refi
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Fee_Sats           : Amount;
      Cash_Out_Cents     : Amount;
      Fee_Debt_Cents     : Amount;
      Refi_Repayment     : Amount;
      Price_Cents        : Price;
      Child_Num          : Ratio_Component;
      Child_Den          : Ratio_Component) is
      Q_Next : constant Amount := Refi_Collateral (Collateral_Sats, Fee_Sats);
      D_Next : constant Amount :=
        Refi_Debt
          (Accrued_Debt_Cents,
           Cash_Out_Cents,
           Fee_Debt_Cents,
           Refi_Repayment);
   begin
      pragma Assert (Q_Next = Collateral_Sats - Fee_Sats);
      pragma Assert (Q_Next >= 0);
      pragma Assert (Q_Next + Fee_Sats = Collateral_Sats);
      if Fee_Sats = 0 then
         pragma Assert (Q_Next = Collateral_Sats);
      end if;

      pragma Assert
        (D_Next =
         Accrued_Debt_Cents + Cash_Out_Cents + Fee_Debt_Cents
         - Refi_Repayment);
      pragma Assert (D_Next >= 0);
      pragma Assert
        (LTV_At_Or_Below
           (D_Next, Q_Next, Price_Cents, Child_Num, Child_Den));
   end Prove_Healthy_Roll_And_Refi;

   procedure Prove_Top_Up_Restores_Target
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Top_Up_Sats        : Amount;
      Price_Cents        : Price;
      Target_Num         : Ratio_Component;
      Target_Den         : Ratio_Component) is
      Shortfall : constant Amount :=
        Target_Shortfall
          (Accrued_Debt_Cents,
           Collateral_Sats,
           Price_Cents,
           Target_Num,
           Target_Den);
      Q_Top : constant Amount :=
        Top_Up_Collateral (Collateral_Sats, Top_Up_Sats);
   begin
      pragma Assert
        (Shortfall =
         Accrued_Debt_Cents * SAT * Target_Den
         - Target_Num * Collateral_Sats * Price_Cents);
      pragma Assert (Target_Num * Top_Up_Sats * Price_Cents >= Shortfall);
      pragma Assert
        (Target_Num * Q_Top * Price_Cents =
         Target_Num * Collateral_Sats * Price_Cents
         + Target_Num * Top_Up_Sats * Price_Cents);
      pragma Assert
        (Target_Num * Q_Top * Price_Cents >=
         Target_Num * Collateral_Sats * Price_Cents + Shortfall);
      pragma Assert
        (Target_Num * Collateral_Sats * Price_Cents + Shortfall =
         Accrued_Debt_Cents * SAT * Target_Den);
      pragma Assert
        (Target_Num * Q_Top * Price_Cents >=
         Accrued_Debt_Cents * SAT * Target_Den);
      pragma Assert
        (LTV_At_Or_Below
           (Accrued_Debt_Cents,
            Q_Top,
            Price_Cents,
            Target_Num,
            Target_Den));
   end Prove_Top_Up_Restores_Target;

   procedure Prove_Partial_Liquidation_Deleverages
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Price_Cents        : Price;
      Liquidated_Sats    : Amount;
      Recovery_Num       : Ratio_Component;
      Recovery_Den       : Ratio_Component) is
      Q_Rem : constant Amount :=
        Remaining_Collateral (Collateral_Sats, Liquidated_Sats);
      D_Scaled : constant Amount :=
        Debt_After_Partial_Liquidation_Scaled
          (Accrued_Debt_Cents,
           Liquidated_Sats,
           Price_Cents,
           Recovery_Num,
           Recovery_Den);
   begin
      pragma Assert (Q_Rem = Collateral_Sats - Liquidated_Sats);
      pragma Assert (Q_Rem + Liquidated_Sats = Collateral_Sats);
      pragma Assert (Q_Rem <= Collateral_Sats);
      pragma Assert
        (D_Scaled =
         Accrued_Debt_Cents * SAT * Recovery_Den
         - Liquidated_Sats * Price_Cents * Recovery_Num);
      pragma Assert (Liquidated_Sats * Price_Cents * Recovery_Num >= 0);
      pragma Assert (D_Scaled <= Accrued_Debt_Cents * SAT * Recovery_Den);
   end Prove_Partial_Liquidation_Deleverages;

   procedure Prove_Exact_Partial_Liquidation_Reaches_Target
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Price_Cents        : Price;
      Liquidated_Sats    : Amount;
      Target_Num         : Ratio_Component;
      Target_Den         : Ratio_Component;
      Recovery_Num       : Ratio_Component;
      Recovery_Den       : Ratio_Component) is
      D_Scaled : constant Amount :=
        Debt_After_Partial_Liquidation_Scaled
          (Accrued_Debt_Cents,
           Liquidated_Sats,
           Price_Cents,
           Recovery_Num,
           Recovery_Den);
      Q_Rem : constant Amount :=
        Remaining_Collateral (Collateral_Sats, Liquidated_Sats);
      Left_Target : constant Amount :=
        D_Scaled * Target_Den;
      Right_Target : constant Amount :=
        Target_Num * Q_Rem * Price_Cents * Recovery_Den;
   begin
      pragma Assert
        (D_Scaled =
         Accrued_Debt_Cents * SAT * Recovery_Den
         - Liquidated_Sats * Price_Cents * Recovery_Num);
      pragma Assert (Q_Rem = Collateral_Sats - Liquidated_Sats);
      pragma Assert
        (Accrued_Debt_Cents * SAT * Recovery_Den * Target_Den
         - Target_Num * Collateral_Sats * Price_Cents * Recovery_Den
         =
         Liquidated_Sats * Price_Cents *
           (Recovery_Num * Target_Den - Target_Num * Recovery_Den));
      pragma Assert
        (Liquidated_Sats * Price_Cents *
           (Recovery_Num * Target_Den - Target_Num * Recovery_Den)
         =
         Liquidated_Sats * Price_Cents * Recovery_Num * Target_Den
         - Liquidated_Sats * Price_Cents * Target_Num * Recovery_Den);
      pragma Assert
        (Accrued_Debt_Cents * SAT * Recovery_Den * Target_Den
         - Liquidated_Sats * Price_Cents * Recovery_Num * Target_Den
         =
         Target_Num * Collateral_Sats * Price_Cents * Recovery_Den
         - Liquidated_Sats * Price_Cents * Target_Num * Recovery_Den);
      pragma Assert
        (Target_Num * Collateral_Sats * Price_Cents * Recovery_Den
         - Liquidated_Sats * Price_Cents * Target_Num * Recovery_Den
         =
         Target_Num * (Collateral_Sats - Liquidated_Sats) *
           Price_Cents * Recovery_Den);
      pragma Assert (Left_Target = Right_Target);
      pragma Assert
        (Target_LTV_Holds_Scaled
           (D_Scaled,
            Q_Rem,
            Price_Cents,
            Target_Num,
            Target_Den,
            Recovery_Den));
   end Prove_Exact_Partial_Liquidation_Reaches_Target;

   procedure Prove_Full_Liquidation_Waterfall
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Price_Cents        : Price;
      Debt_Claim_Sats    : Amount) is
      pragma Unreferenced (Accrued_Debt_Cents, Price_Cents);
      Lender : constant Amount := Lender_BTC (Collateral_Sats, Debt_Claim_Sats);
      Borrower : constant Amount :=
        Borrower_BTC (Collateral_Sats, Debt_Claim_Sats);
   begin
      if Debt_Claim_Sats <= Collateral_Sats then
         pragma Assert (Lender = Debt_Claim_Sats);
         pragma Assert (Borrower = Collateral_Sats - Debt_Claim_Sats);
      else
         pragma Assert (Lender = Collateral_Sats);
         pragma Assert (Borrower = 0);
      end if;

      pragma Assert (Lender >= 0);
      pragma Assert (Lender <= Collateral_Sats);
      pragma Assert (Borrower >= 0);
      pragma Assert (Borrower <= Collateral_Sats);
      pragma Assert (Lender + Borrower = Collateral_Sats);
   end Prove_Full_Liquidation_Waterfall;

   procedure Prove_Residual_Roll_Carries_Scaled_Debt
     (Accrued_Debt_Cents : Amount;
      Collateral_Sats    : Amount;
      Price_Cents        : Price;
      Liquidated_Sats    : Amount;
      Target_Num         : Ratio_Component;
      Target_Den         : Ratio_Component;
      Recovery_Num       : Ratio_Component;
      Recovery_Den       : Ratio_Component) is
      D_Scaled : constant Amount :=
        Debt_After_Partial_Liquidation_Scaled
          (Accrued_Debt_Cents,
           Liquidated_Sats,
           Price_Cents,
           Recovery_Num,
           Recovery_Den);
      Q_Next : constant Amount :=
        Remaining_Collateral (Collateral_Sats, Liquidated_Sats);
      D_Den : constant Amount :=
        Debt_Den_After_Partial_Liquidation (Recovery_Den);
   begin
      Prove_Exact_Partial_Liquidation_Reaches_Target
        (Accrued_Debt_Cents,
         Collateral_Sats,
         Price_Cents,
         Liquidated_Sats,
         Target_Num,
         Target_Den,
         Recovery_Num,
         Recovery_Den);
      pragma Assert (D_Den = SAT * Recovery_Den);
      pragma Assert
        (Target_LTV_Holds_Scaled
           (D_Scaled,
            Q_Next,
            Price_Cents,
            Target_Num,
            Target_Den,
            Recovery_Den));
   end Prove_Residual_Roll_Carries_Scaled_Debt;
end Btc_Loan_Lifecycle_Algebra;
