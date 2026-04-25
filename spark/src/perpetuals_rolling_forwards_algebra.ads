pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Perpetuals_Rolling_Forwards_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Price is Valid_Big_Integer;
   subtype Ratio_Component is Valid_Big_Integer;

   SAT : constant Amount := 100_000_000;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);

   function Abs_Amount (X : Amount) return Amount is
     (if X < 0 then -X else X);

   --  #10:
   --    DeltaScaled = B * (N * (P - F) + Phi * F)
   --  Phi is signed. Positive Phi is funding credited to the long.
   function Delta_Scaled
     (Notional_Cents : Amount;
      Forward        : Price;
      Settlement     : Price;
      Funding_Cents  : Amount) return Amount
   is
     (SAT *
        (Notional_Cents * (Settlement - Forward)
         + Funding_Cents * Forward))
   with
     Pre =>
       Nonnegative (Notional_Cents)
       and Positive (Forward)
       and Positive (Settlement);

   function Short_Delta_Scaled
     (Notional_Cents : Amount;
      Forward        : Price;
      Settlement     : Price;
      Funding_Cents  : Amount) return Amount
   is (-Delta_Scaled
         (Notional_Cents, Forward, Settlement, Funding_Cents))
   with
     Pre =>
       Nonnegative (Notional_Cents)
       and Positive (Forward)
       and Positive (Settlement);

   --  #10: UnitScaled = P * F.
   function Unit_Scaled
     (Settlement : Price;
      Forward    : Price) return Amount
   is (Settlement * Forward)
   with
     Pre => Positive (Settlement) and Positive (Forward);

   --  #10:
   --    LongEquityScaled  = LQ * P * F + DeltaScaled
   --    ShortEquityScaled = SQ * P * F - DeltaScaled
   function Long_Equity_Scaled
     (Long_Collateral : Amount;
      Notional_Cents  : Amount;
      Forward         : Price;
      Settlement      : Price;
      Funding_Cents   : Amount) return Amount
   is
     (Long_Collateral * Settlement * Forward
      + Delta_Scaled
          (Notional_Cents, Forward, Settlement, Funding_Cents))
   with
     Pre =>
       Nonnegative (Long_Collateral)
       and Nonnegative (Notional_Cents)
       and Positive (Forward)
       and Positive (Settlement);

   function Short_Equity_Scaled
     (Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount) return Amount
   is
     (Short_Collateral * Settlement * Forward
      - Delta_Scaled
          (Notional_Cents, Forward, Settlement, Funding_Cents))
   with
     Pre =>
       Nonnegative (Short_Collateral)
       and Nonnegative (Notional_Cents)
       and Positive (Forward)
       and Positive (Settlement);

   --  #10 floor witness:
   --    Transfer = floor(abs(DeltaScaled) / UnitScaled)
   --    Remainder = abs(DeltaScaled) - Transfer * UnitScaled
   function Valid_Transfer_Quotient
     (Abs_Delta : Amount;
      Unit      : Amount;
      Transfer  : Amount;
      Remainder : Amount) return Boolean
   is
     (Transfer * Unit + Remainder = Abs_Delta
      and Remainder >= 0
      and Remainder < Unit)
   with
     Pre =>
       Nonnegative (Abs_Delta)
       and Positive (Unit)
       and Nonnegative (Transfer)
       and Nonnegative (Remainder);

   function Long_Funding_Scaled
     (Funding_Cents : Amount;
      Forward       : Price) return Amount
   is (SAT * Funding_Cents * Forward)
   with
     Pre => Positive (Forward);

   function Short_Funding_Scaled
     (Funding_Cents : Amount;
      Forward       : Price) return Amount
   is (-Long_Funding_Scaled (Funding_Cents, Forward))
   with
     Pre => Positive (Forward);

   function Long_Wins
     (Notional_Cents : Amount;
      Forward        : Price;
      Settlement     : Price;
      Funding_Cents  : Amount) return Boolean
   is
     (Delta_Scaled
        (Notional_Cents, Forward, Settlement, Funding_Cents) >= 0)
   with
     Pre =>
       Nonnegative (Notional_Cents)
       and Positive (Forward)
       and Positive (Settlement);

   function Short_Wins
     (Notional_Cents : Amount;
      Forward        : Price;
      Settlement     : Price;
      Funding_Cents  : Amount) return Boolean
   is
     (Delta_Scaled
        (Notional_Cents, Forward, Settlement, Funding_Cents) < 0)
   with
     Pre =>
       Nonnegative (Notional_Cents)
       and Positive (Forward)
       and Positive (Settlement);

   function Long_Win_Long_Collateral
     (Long_Collateral : Amount;
      Transfer        : Amount) return Amount
   is (Long_Collateral + Transfer)
   with
     Pre => Nonnegative (Long_Collateral) and Nonnegative (Transfer);

   function Long_Win_Short_Collateral
     (Short_Collateral : Amount;
      Transfer         : Amount) return Amount
   is (Short_Collateral - Transfer)
   with
     Pre =>
       Nonnegative (Short_Collateral)
       and Nonnegative (Transfer)
       and Transfer <= Short_Collateral;

   function Short_Win_Long_Collateral
     (Long_Collateral : Amount;
      Transfer        : Amount) return Amount
   is (Long_Collateral - Transfer)
   with
     Pre =>
       Nonnegative (Long_Collateral)
       and Nonnegative (Transfer)
       and Transfer <= Long_Collateral;

   function Short_Win_Short_Collateral
     (Short_Collateral : Amount;
      Transfer         : Amount) return Amount
   is (Short_Collateral + Transfer)
   with
     Pre => Nonnegative (Short_Collateral) and Nonnegative (Transfer);

   function Short_Insolvent_Long_Collateral
     (Long_Collateral  : Amount;
      Short_Collateral : Amount) return Amount
   is (Long_Collateral + Short_Collateral)
   with
     Pre => Nonnegative (Long_Collateral) and Nonnegative (Short_Collateral);

   function Short_Insolvent_Short_Collateral return Amount is (0);

   function Long_Insolvent_Long_Collateral return Amount is (0);

   function Long_Insolvent_Short_Collateral
     (Long_Collateral  : Amount;
      Short_Collateral : Amount) return Amount
   is (Short_Collateral + Long_Collateral)
   with
     Pre => Nonnegative (Long_Collateral) and Nonnegative (Short_Collateral);

   --  #10 maintenance margin:
   --    Q * P * MMR_den >= N * B * MMR_num.
   function Margin_Satisfied
     (Collateral      : Amount;
      Settlement      : Price;
      Notional_Cents  : Amount;
      MMR_Num         : Ratio_Component;
      MMR_Den         : Ratio_Component) return Boolean
   is
     (Collateral * Settlement * MMR_Den
      >= Notional_Cents * SAT * MMR_Num)
   with
     Pre =>
       Nonnegative (Collateral)
       and Positive (Settlement)
       and Nonnegative (Notional_Cents)
       and Nonnegative (MMR_Num)
       and Positive (MMR_Den);

   function Roll_Long_Collateral
     (Post_Long_Collateral : Amount) return Amount
   is (Post_Long_Collateral)
   with
     Pre => Nonnegative (Post_Long_Collateral);

   function Roll_Short_Collateral
     (Post_Short_Collateral : Amount) return Amount
   is (Post_Short_Collateral)
   with
     Pre => Nonnegative (Post_Short_Collateral);

   function Same_Notional_Roll
     (Notional_Cents : Amount) return Amount
   is (Notional_Cents)
   with
     Pre => Nonnegative (Notional_Cents);

   function Reduced_Notional_Roll
     (Reduced_Notional_Cents : Amount) return Amount
   is (Reduced_Notional_Cents)
   with
     Pre => Nonnegative (Reduced_Notional_Cents);

   procedure Prove_Delta_Zero_Sum
     (Notional_Cents : Amount;
      Forward        : Price;
      Settlement     : Price;
      Funding_Cents  : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Notional_Cents)
       and Positive (Forward)
       and Positive (Settlement),
     Post =>
       Delta_Scaled
         (Notional_Cents, Forward, Settlement, Funding_Cents)
       + Short_Delta_Scaled
         (Notional_Cents, Forward, Settlement, Funding_Cents) = 0;

   procedure Prove_Funding_Zero_Sum
     (Funding_Cents : Amount;
      Forward       : Price)
   with
     Global => null,
     Pre => Positive (Forward),
     Post =>
       Long_Funding_Scaled (Funding_Cents, Forward)
       + Short_Funding_Scaled (Funding_Cents, Forward) = 0;

   procedure Prove_Win_Branch_Coverage
     (Notional_Cents : Amount;
      Forward        : Price;
      Settlement     : Price;
      Funding_Cents  : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Notional_Cents)
       and Positive (Forward)
       and Positive (Settlement),
     Post =>
       (Long_Wins
          (Notional_Cents, Forward, Settlement, Funding_Cents)
        or Short_Wins
          (Notional_Cents, Forward, Settlement, Funding_Cents))
       and
       (Long_Wins
          (Notional_Cents, Forward, Settlement, Funding_Cents)
        /=
        Short_Wins
          (Notional_Cents, Forward, Settlement, Funding_Cents));

   procedure Prove_Equity_Expansion
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Collateral)
       and Nonnegative (Short_Collateral)
       and Nonnegative (Notional_Cents)
       and Positive (Forward)
       and Positive (Settlement),
     Post =>
       Long_Equity_Scaled
         (Long_Collateral,
          Notional_Cents,
          Forward,
          Settlement,
          Funding_Cents)
       =
       Long_Collateral * Settlement * Forward
       + SAT * Notional_Cents * (Settlement - Forward)
       + SAT * Funding_Cents * Forward
       and
       Short_Equity_Scaled
         (Short_Collateral,
          Notional_Cents,
          Forward,
          Settlement,
          Funding_Cents)
       =
       Short_Collateral * Settlement * Forward
       - SAT * Notional_Cents * (Settlement - Forward)
       - SAT * Funding_Cents * Forward;

   procedure Prove_Equity_Conservation
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Collateral)
       and Nonnegative (Short_Collateral)
       and Nonnegative (Notional_Cents)
       and Positive (Forward)
       and Positive (Settlement),
     Post =>
       Long_Equity_Scaled
         (Long_Collateral,
          Notional_Cents,
          Forward,
          Settlement,
          Funding_Cents)
       +
       Short_Equity_Scaled
         (Short_Collateral,
          Notional_Cents,
          Forward,
          Settlement,
          Funding_Cents)
       =
       (Long_Collateral + Short_Collateral) * Settlement * Forward;

   procedure Prove_Transfer_Quotient_Bounds
     (Abs_Delta : Amount;
      Unit      : Amount;
      Transfer  : Amount;
      Remainder : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Abs_Delta)
       and then Positive (Unit)
       and then Nonnegative (Transfer)
       and then Nonnegative (Remainder)
       and then Valid_Transfer_Quotient
         (Abs_Delta, Unit, Transfer, Remainder),
     Post =>
       Transfer * Unit <= Abs_Delta
       and Abs_Delta - Transfer * Unit = Remainder
       and Abs_Delta - Transfer * Unit >= 0
       and Abs_Delta - Transfer * Unit < Unit;

   procedure Prove_Long_Win_Solvent_Transfer
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount;
      Transfer         : Amount;
      Remainder        : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Collateral)
       and then Nonnegative (Short_Collateral)
       and then Nonnegative (Notional_Cents)
       and then Positive (Forward)
       and then Positive (Settlement)
       and then Nonnegative (Transfer)
       and then Nonnegative (Remainder)
       and then Long_Wins
         (Notional_Cents, Forward, Settlement, Funding_Cents)
       and then Valid_Transfer_Quotient
         (Abs_Amount
            (Delta_Scaled
               (Notional_Cents, Forward, Settlement, Funding_Cents)),
          Unit_Scaled (Settlement, Forward),
          Transfer,
          Remainder)
       and then Transfer <= Short_Collateral,
     Post =>
       Long_Win_Long_Collateral (Long_Collateral, Transfer)
       + Long_Win_Short_Collateral (Short_Collateral, Transfer)
       = Long_Collateral + Short_Collateral
       and Long_Win_Short_Collateral (Short_Collateral, Transfer) >= 0
       and Long_Equity_Scaled
         (Long_Collateral,
          Notional_Cents,
          Forward,
          Settlement,
          Funding_Cents)
       -
       Long_Win_Long_Collateral (Long_Collateral, Transfer)
       * Settlement * Forward
       = Remainder
       and Remainder >= 0
       and Remainder < Unit_Scaled (Settlement, Forward);

   procedure Prove_Short_Win_Solvent_Transfer
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount;
      Transfer         : Amount;
      Remainder        : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Collateral)
       and then Nonnegative (Short_Collateral)
       and then Nonnegative (Notional_Cents)
       and then Positive (Forward)
       and then Positive (Settlement)
       and then Nonnegative (Transfer)
       and then Nonnegative (Remainder)
       and then Short_Wins
         (Notional_Cents, Forward, Settlement, Funding_Cents)
       and then Valid_Transfer_Quotient
         (Abs_Amount
            (Delta_Scaled
               (Notional_Cents, Forward, Settlement, Funding_Cents)),
          Unit_Scaled (Settlement, Forward),
          Transfer,
          Remainder)
       and then Transfer <= Long_Collateral,
     Post =>
       Short_Win_Long_Collateral (Long_Collateral, Transfer)
       + Short_Win_Short_Collateral (Short_Collateral, Transfer)
       = Long_Collateral + Short_Collateral
       and Short_Win_Long_Collateral (Long_Collateral, Transfer) >= 0
       and Short_Equity_Scaled
         (Short_Collateral,
          Notional_Cents,
          Forward,
          Settlement,
          Funding_Cents)
       -
       Short_Win_Short_Collateral (Short_Collateral, Transfer)
       * Settlement * Forward
       = Remainder
       and Remainder >= 0
       and Remainder < Unit_Scaled (Settlement, Forward);

   procedure Prove_Short_Insolvent_Liquidation
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount;
      Transfer         : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Collateral)
       and then Nonnegative (Short_Collateral)
       and then Nonnegative (Notional_Cents)
       and then Positive (Forward)
       and then Positive (Settlement)
       and then Nonnegative (Transfer)
       and then Long_Wins
         (Notional_Cents, Forward, Settlement, Funding_Cents)
       and then Transfer > Short_Collateral,
     Post =>
       Short_Insolvent_Long_Collateral
         (Long_Collateral, Short_Collateral)
       + Short_Insolvent_Short_Collateral
       = Long_Collateral + Short_Collateral
       and
       Short_Insolvent_Long_Collateral
         (Long_Collateral, Short_Collateral)
       - Long_Collateral = Short_Collateral
       and Short_Insolvent_Short_Collateral = 0;

   procedure Prove_Long_Insolvent_Liquidation
     (Long_Collateral  : Amount;
      Short_Collateral : Amount;
      Notional_Cents   : Amount;
      Forward          : Price;
      Settlement       : Price;
      Funding_Cents    : Amount;
      Transfer         : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Collateral)
       and then Nonnegative (Short_Collateral)
       and then Nonnegative (Notional_Cents)
       and then Positive (Forward)
       and then Positive (Settlement)
       and then Nonnegative (Transfer)
       and then Short_Wins
         (Notional_Cents, Forward, Settlement, Funding_Cents)
       and then Transfer > Long_Collateral,
     Post =>
       Long_Insolvent_Long_Collateral
       + Long_Insolvent_Short_Collateral
         (Long_Collateral, Short_Collateral)
       = Long_Collateral + Short_Collateral
       and
       Long_Insolvent_Short_Collateral
         (Long_Collateral, Short_Collateral)
       - Short_Collateral = Long_Collateral
       and Long_Insolvent_Long_Collateral = 0;

   procedure Prove_Margin_Cross_Multiply_Definition
     (Collateral      : Amount;
      Settlement      : Price;
      Notional_Cents  : Amount;
      MMR_Num         : Ratio_Component;
      MMR_Den         : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral)
       and Positive (Settlement)
       and Nonnegative (Notional_Cents)
       and Nonnegative (MMR_Num)
       and Positive (MMR_Den),
     Post =>
       Margin_Satisfied
         (Collateral, Settlement, Notional_Cents, MMR_Num, MMR_Den)
       =
       (Collateral * Settlement * MMR_Den
        >= Notional_Cents * SAT * MMR_Num);

   procedure Prove_Same_Notional_Roll
     (Start_Long_Collateral  : Amount;
      Start_Short_Collateral : Amount;
      Post_Long_Collateral   : Amount;
      Post_Short_Collateral  : Amount;
      Notional_Cents         : Amount;
      Settlement             : Price;
      MMR_Num                : Ratio_Component;
      MMR_Den                : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Start_Long_Collateral)
       and then Nonnegative (Start_Short_Collateral)
       and then Nonnegative (Post_Long_Collateral)
       and then Nonnegative (Post_Short_Collateral)
       and then Nonnegative (Notional_Cents)
       and then Positive (Settlement)
       and then Nonnegative (MMR_Num)
       and then Positive (MMR_Den)
       and then Post_Long_Collateral + Post_Short_Collateral =
         Start_Long_Collateral + Start_Short_Collateral
       and then Margin_Satisfied
         (Post_Long_Collateral,
          Settlement,
          Notional_Cents,
          MMR_Num,
          MMR_Den)
       and then Margin_Satisfied
         (Post_Short_Collateral,
          Settlement,
          Notional_Cents,
          MMR_Num,
          MMR_Den),
     Post =>
       Roll_Long_Collateral (Post_Long_Collateral)
       + Roll_Short_Collateral (Post_Short_Collateral)
       = Start_Long_Collateral + Start_Short_Collateral
       and Same_Notional_Roll (Notional_Cents) = Notional_Cents
       and Margin_Satisfied
         (Roll_Long_Collateral (Post_Long_Collateral),
          Settlement,
          Same_Notional_Roll (Notional_Cents),
          MMR_Num,
          MMR_Den)
       and Margin_Satisfied
         (Roll_Short_Collateral (Post_Short_Collateral),
          Settlement,
          Same_Notional_Roll (Notional_Cents),
          MMR_Num,
          MMR_Den);

   procedure Prove_Reduced_Notional_Roll
     (Start_Long_Collateral   : Amount;
      Start_Short_Collateral  : Amount;
      Post_Long_Collateral    : Amount;
      Post_Short_Collateral   : Amount;
      Notional_Cents          : Amount;
      Reduced_Notional_Cents  : Amount;
      Settlement              : Price;
      MMR_Num                 : Ratio_Component;
      MMR_Den                 : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Start_Long_Collateral)
       and then Nonnegative (Start_Short_Collateral)
       and then Nonnegative (Post_Long_Collateral)
       and then Nonnegative (Post_Short_Collateral)
       and then Nonnegative (Notional_Cents)
       and then Nonnegative (Reduced_Notional_Cents)
       and then Reduced_Notional_Cents <= Notional_Cents
       and then Positive (Settlement)
       and then Nonnegative (MMR_Num)
       and then Positive (MMR_Den)
       and then Post_Long_Collateral + Post_Short_Collateral =
         Start_Long_Collateral + Start_Short_Collateral
       and then Margin_Satisfied
         (Post_Long_Collateral,
          Settlement,
          Reduced_Notional_Cents,
          MMR_Num,
          MMR_Den)
       and then Margin_Satisfied
         (Post_Short_Collateral,
          Settlement,
          Reduced_Notional_Cents,
          MMR_Num,
          MMR_Den),
     Post =>
       Roll_Long_Collateral (Post_Long_Collateral)
       + Roll_Short_Collateral (Post_Short_Collateral)
       = Start_Long_Collateral + Start_Short_Collateral
       and Reduced_Notional_Roll (Reduced_Notional_Cents)
         = Reduced_Notional_Cents
       and Reduced_Notional_Roll (Reduced_Notional_Cents)
         <= Notional_Cents
       and Margin_Satisfied
         (Roll_Long_Collateral (Post_Long_Collateral),
          Settlement,
          Reduced_Notional_Roll (Reduced_Notional_Cents),
          MMR_Num,
          MMR_Den)
       and Margin_Satisfied
         (Roll_Short_Collateral (Post_Short_Collateral),
          Settlement,
          Reduced_Notional_Roll (Reduced_Notional_Cents),
          MMR_Num,
          MMR_Den);

   procedure Prove_Two_Step_Roll_Conservation
     (Start_Long_Collateral  : Amount;
      Start_Short_Collateral : Amount;
      Mid_Long_Collateral    : Amount;
      Mid_Short_Collateral   : Amount;
      End_Long_Collateral    : Amount;
      End_Short_Collateral   : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Start_Long_Collateral)
       and Nonnegative (Start_Short_Collateral)
       and Nonnegative (Mid_Long_Collateral)
       and Nonnegative (Mid_Short_Collateral)
       and Nonnegative (End_Long_Collateral)
       and Nonnegative (End_Short_Collateral)
       and Mid_Long_Collateral + Mid_Short_Collateral =
         Start_Long_Collateral + Start_Short_Collateral
       and End_Long_Collateral + End_Short_Collateral =
         Mid_Long_Collateral + Mid_Short_Collateral,
     Post =>
       End_Long_Collateral + End_Short_Collateral =
       Start_Long_Collateral + Start_Short_Collateral;
end Perpetuals_Rolling_Forwards_Algebra;
