pragma SPARK_Mode (On);

package body Perpetuals_Rolling_Forwards_Algebra is
   procedure Prove_Delta_Zero_Sum
     (Notional_Cents : Amount;
      Forward        : Price;
      Settlement     : Price;
      Funding_Cents  : Amount) is
      Long_Delta : constant Amount :=
        Delta_Scaled
          (Notional_Cents, Forward, Settlement, Funding_Cents);
      Short_Delta : constant Amount :=
        Short_Delta_Scaled
          (Notional_Cents, Forward, Settlement, Funding_Cents);
   begin
      pragma Assert (Short_Delta = -Long_Delta);
      pragma Assert (Long_Delta + Short_Delta = 0);
   end Prove_Delta_Zero_Sum;

   procedure Prove_Funding_Zero_Sum
     (Funding_Cents : Amount;
      Forward       : Price) is
      Long_Funding : constant Amount :=
        Long_Funding_Scaled (Funding_Cents, Forward);
      Short_Funding : constant Amount :=
        Short_Funding_Scaled (Funding_Cents, Forward);
   begin
      pragma Assert (Short_Funding = -Long_Funding);
      pragma Assert (Long_Funding + Short_Funding = 0);
   end Prove_Funding_Zero_Sum;

   procedure Prove_Win_Branch_Coverage
     (Notional_Cents : Amount;
      Forward        : Price;
      Settlement     : Price;
      Funding_Cents  : Amount) is
      Period_Delta : constant Amount :=
        Delta_Scaled
          (Notional_Cents, Forward, Settlement, Funding_Cents);
   begin
      if Period_Delta >= 0 then
         pragma Assert
           (Long_Wins
              (Notional_Cents, Forward, Settlement, Funding_Cents));
         pragma Assert
           (not Short_Wins
              (Notional_Cents, Forward, Settlement, Funding_Cents));
      else
         pragma Assert
           (Short_Wins
              (Notional_Cents, Forward, Settlement, Funding_Cents));
         pragma Assert
           (not Long_Wins
              (Notional_Cents, Forward, Settlement, Funding_Cents));
      end if;
   end Prove_Win_Branch_Coverage;

   procedure Prove_Equity_Expansion
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount) is
      Period_Delta : constant Amount :=
        Delta_Scaled
          (Notional_Cents, Forward, Settlement, Funding_Cents);
      Expanded_Delta : constant Amount :=
        SAT * Notional_Cents * (Settlement - Forward)
        + SAT * Funding_Cents * Forward;
   begin
      pragma Assert
        (Period_Delta =
           SAT *
             (Notional_Cents * (Settlement - Forward)
              + Funding_Cents * Forward));
      pragma Assert (Period_Delta = Expanded_Delta);
      pragma Assert
        (Long_Equity_Scaled
           (Long_Collateral,
            Notional_Cents,
            Forward,
            Settlement,
            Funding_Cents)
         =
         Long_Collateral * Settlement * Forward + Expanded_Delta);
      pragma Assert
        (Short_Equity_Scaled
           (Short_Collateral,
            Notional_Cents,
            Forward,
            Settlement,
            Funding_Cents)
         =
         Short_Collateral * Settlement * Forward - Expanded_Delta);
   end Prove_Equity_Expansion;

   procedure Prove_Equity_Conservation
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount) is
      Period_Delta : constant Amount :=
        Delta_Scaled
          (Notional_Cents, Forward, Settlement, Funding_Cents);
      Long_Equity : constant Amount :=
        Long_Equity_Scaled
          (Long_Collateral,
           Notional_Cents,
           Forward,
           Settlement,
           Funding_Cents);
      Short_Equity : constant Amount :=
        Short_Equity_Scaled
          (Short_Collateral,
           Notional_Cents,
           Forward,
           Settlement,
           Funding_Cents);
   begin
      pragma Assert
        (Long_Equity =
           Long_Collateral * Settlement * Forward + Period_Delta);
      pragma Assert
        (Short_Equity =
           Short_Collateral * Settlement * Forward - Period_Delta);
      pragma Assert
        (Long_Equity + Short_Equity =
           Long_Collateral * Settlement * Forward
           + Short_Collateral * Settlement * Forward);
      pragma Assert
        (Long_Collateral * Settlement * Forward
         + Short_Collateral * Settlement * Forward
         =
         (Long_Collateral + Short_Collateral) *
           Settlement * Forward);
   end Prove_Equity_Conservation;

   procedure Prove_Transfer_Quotient_Bounds
     (Abs_Delta : Amount;
      Unit      : Amount;
      Transfer  : Amount;
      Remainder : Amount) is
   begin
      pragma Assert (Transfer * Unit + Remainder = Abs_Delta);
      pragma Assert (Remainder >= 0);
      pragma Assert (Transfer * Unit <= Abs_Delta);
      pragma Assert (Abs_Delta - Transfer * Unit = Remainder);
      pragma Assert (Abs_Delta - Transfer * Unit >= 0);
      pragma Assert (Abs_Delta - Transfer * Unit < Unit);
   end Prove_Transfer_Quotient_Bounds;

   procedure Prove_Long_Win_Solvent_Transfer
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount;
      Transfer         : Amount;
      Remainder        : Amount) is
      Period_Delta : constant Amount :=
        Delta_Scaled
          (Notional_Cents, Forward, Settlement, Funding_Cents);
      Unit : constant Amount := Unit_Scaled (Settlement, Forward);
      Long_After : constant Amount :=
        Long_Win_Long_Collateral (Long_Collateral, Transfer);
      Short_After : constant Amount :=
        Long_Win_Short_Collateral (Short_Collateral, Transfer);
      Long_Equity : constant Amount :=
        Long_Equity_Scaled
          (Long_Collateral,
           Notional_Cents,
           Forward,
           Settlement,
           Funding_Cents);
   begin
      pragma Assert (Period_Delta >= 0);
      pragma Assert (Abs_Amount (Period_Delta) = Period_Delta);
      Prove_Transfer_Quotient_Bounds
        (Abs_Amount (Period_Delta), Unit, Transfer, Remainder);
      pragma Assert (Transfer * Unit + Remainder = Period_Delta);
      pragma Assert (Long_After = Long_Collateral + Transfer);
      pragma Assert (Short_After = Short_Collateral - Transfer);
      pragma Assert (Short_After >= 0);
      pragma Assert (Long_After + Short_After =
                     Long_Collateral + Short_Collateral);
      pragma Assert (Long_Equity = Long_Collateral * Unit + Period_Delta);
      pragma Assert
        (Long_After * Unit =
           Long_Collateral * Unit + Transfer * Unit);
      pragma Assert
        (Long_Equity - Long_After * Unit =
           Period_Delta - Transfer * Unit);
      pragma Assert
        (Long_Equity - Long_After * Unit = Remainder);
      pragma Assert (Remainder >= 0);
      pragma Assert (Remainder < Unit);
   end Prove_Long_Win_Solvent_Transfer;

   procedure Prove_Short_Win_Solvent_Transfer
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount;
      Transfer         : Amount;
      Remainder        : Amount) is
      Period_Delta : constant Amount :=
        Delta_Scaled
          (Notional_Cents, Forward, Settlement, Funding_Cents);
      Unit : constant Amount := Unit_Scaled (Settlement, Forward);
      Long_After : constant Amount :=
        Short_Win_Long_Collateral (Long_Collateral, Transfer);
      Short_After : constant Amount :=
        Short_Win_Short_Collateral (Short_Collateral, Transfer);
      Short_Equity : constant Amount :=
        Short_Equity_Scaled
          (Short_Collateral,
           Notional_Cents,
           Forward,
           Settlement,
           Funding_Cents);
   begin
      pragma Assert (Period_Delta < 0);
      pragma Assert (Abs_Amount (Period_Delta) = -Period_Delta);
      Prove_Transfer_Quotient_Bounds
        (Abs_Amount (Period_Delta), Unit, Transfer, Remainder);
      pragma Assert (Transfer * Unit + Remainder = -Period_Delta);
      pragma Assert (Long_After = Long_Collateral - Transfer);
      pragma Assert (Short_After = Short_Collateral + Transfer);
      pragma Assert (Long_After >= 0);
      pragma Assert (Long_After + Short_After =
                     Long_Collateral + Short_Collateral);
      pragma Assert (Short_Equity = Short_Collateral * Unit - Period_Delta);
      pragma Assert
        (Short_After * Unit =
           Short_Collateral * Unit + Transfer * Unit);
      pragma Assert
        (Short_Equity - Short_After * Unit =
           -Period_Delta - Transfer * Unit);
      pragma Assert
        (Short_Equity - Short_After * Unit = Remainder);
      pragma Assert (Remainder >= 0);
      pragma Assert (Remainder < Unit);
   end Prove_Short_Win_Solvent_Transfer;

   procedure Prove_Short_Insolvent_Liquidation
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount;
      Transfer         : Amount) is
      pragma Unreferenced
        (Notional_Cents, Forward, Settlement, Funding_Cents, Transfer);
      Long_After : constant Amount :=
        Short_Insolvent_Long_Collateral
          (Long_Collateral, Short_Collateral);
      Short_After : constant Amount :=
        Short_Insolvent_Short_Collateral;
   begin
      pragma Assert (Long_After = Long_Collateral + Short_Collateral);
      pragma Assert (Short_After = 0);
      pragma Assert (Long_After + Short_After =
                     Long_Collateral + Short_Collateral);
      pragma Assert (Long_After - Long_Collateral = Short_Collateral);
   end Prove_Short_Insolvent_Liquidation;

   procedure Prove_Long_Insolvent_Liquidation
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount;
      Transfer         : Amount) is
      pragma Unreferenced
        (Notional_Cents, Forward, Settlement, Funding_Cents, Transfer);
      Long_After : constant Amount :=
        Long_Insolvent_Long_Collateral;
      Short_After : constant Amount :=
        Long_Insolvent_Short_Collateral
          (Long_Collateral, Short_Collateral);
   begin
      pragma Assert (Long_After = 0);
      pragma Assert (Short_After = Short_Collateral + Long_Collateral);
      pragma Assert (Long_After + Short_After =
                     Long_Collateral + Short_Collateral);
      pragma Assert (Short_After - Short_Collateral = Long_Collateral);
   end Prove_Long_Insolvent_Liquidation;

   procedure Prove_Margin_Cross_Multiply_Definition
     (Collateral      : Amount;
      Settlement      : Price;
      Notional_Cents  : Amount;
      MMR_Num         : Ratio_Component;
      MMR_Den         : Ratio_Component) is
   begin
      pragma Assert
        (Margin_Satisfied
           (Collateral, Settlement, Notional_Cents, MMR_Num, MMR_Den)
         =
         (Collateral * Settlement * MMR_Den
          >= Notional_Cents * SAT * MMR_Num));
   end Prove_Margin_Cross_Multiply_Definition;

   procedure Prove_Same_Notional_Roll
     (Start_Long_Collateral  : Amount;
      Start_Short_Collateral : Amount;
      Post_Long_Collateral   : Amount;
      Post_Short_Collateral  : Amount;
      Notional_Cents         : Amount;
      Settlement             : Price;
      MMR_Num                : Ratio_Component;
      MMR_Den                : Ratio_Component) is
      Long_Next : constant Amount :=
        Roll_Long_Collateral (Post_Long_Collateral);
      Short_Next : constant Amount :=
        Roll_Short_Collateral (Post_Short_Collateral);
      N_Next : constant Amount := Same_Notional_Roll (Notional_Cents);
   begin
      pragma Assert (Long_Next = Post_Long_Collateral);
      pragma Assert (Short_Next = Post_Short_Collateral);
      pragma Assert (N_Next = Notional_Cents);
      pragma Assert
        (Long_Next + Short_Next =
         Start_Long_Collateral + Start_Short_Collateral);
      pragma Assert
        (Margin_Satisfied
           (Long_Next, Settlement, N_Next, MMR_Num, MMR_Den));
      pragma Assert
        (Margin_Satisfied
           (Short_Next, Settlement, N_Next, MMR_Num, MMR_Den));
   end Prove_Same_Notional_Roll;

   procedure Prove_Reduced_Notional_Roll
     (Start_Long_Collateral   : Amount;
      Start_Short_Collateral  : Amount;
      Post_Long_Collateral    : Amount;
      Post_Short_Collateral   : Amount;
      Notional_Cents          : Amount;
      Reduced_Notional_Cents  : Amount;
      Settlement              : Price;
      MMR_Num                 : Ratio_Component;
      MMR_Den                 : Ratio_Component) is
      Long_Next : constant Amount :=
        Roll_Long_Collateral (Post_Long_Collateral);
      Short_Next : constant Amount :=
        Roll_Short_Collateral (Post_Short_Collateral);
      N_Next : constant Amount :=
        Reduced_Notional_Roll (Reduced_Notional_Cents);
   begin
      pragma Assert (Long_Next = Post_Long_Collateral);
      pragma Assert (Short_Next = Post_Short_Collateral);
      pragma Assert (N_Next = Reduced_Notional_Cents);
      pragma Assert (N_Next <= Notional_Cents);
      pragma Assert
        (Long_Next + Short_Next =
         Start_Long_Collateral + Start_Short_Collateral);
      pragma Assert
        (Margin_Satisfied
           (Long_Next, Settlement, N_Next, MMR_Num, MMR_Den));
      pragma Assert
        (Margin_Satisfied
           (Short_Next, Settlement, N_Next, MMR_Num, MMR_Den));
   end Prove_Reduced_Notional_Roll;

   procedure Prove_Two_Step_Roll_Conservation
     (Start_Long_Collateral  : Amount;
      Start_Short_Collateral : Amount;
      Mid_Long_Collateral    : Amount;
      Mid_Short_Collateral   : Amount;
      End_Long_Collateral    : Amount;
      End_Short_Collateral   : Amount) is
   begin
      pragma Assert
        (Mid_Long_Collateral + Mid_Short_Collateral =
         Start_Long_Collateral + Start_Short_Collateral);
      pragma Assert
        (End_Long_Collateral + End_Short_Collateral =
         Mid_Long_Collateral + Mid_Short_Collateral);
      pragma Assert
        (End_Long_Collateral + End_Short_Collateral =
         Start_Long_Collateral + Start_Short_Collateral);
   end Prove_Two_Step_Roll_Conservation;
end Perpetuals_Rolling_Forwards_Algebra;
