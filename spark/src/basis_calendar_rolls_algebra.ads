pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Basis_Calendar_Rolls_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Price is Valid_Big_Integer;
   subtype Spread is Valid_Big_Integer;
   subtype Signed_Amount is Valid_Big_Integer;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);

   function Min (A, B : Amount) return Amount is
     (if A <= B then A else B)
   with
     Pre => Nonnegative (A) and Nonnegative (B);

   function Abs_Signed (X : Signed_Amount) return Amount is
     (if X >= 0 then X else -X);

   --  #26: Basis(F, S) = F - S.
   function Basis (Forward : Price; Spot : Price) return Spread is
     (Forward - Spot)
   with
     Pre => Positive (Forward) and Positive (Spot);

   --  #26: Calendar(Far, Near) = Far - Near.
   function Calendar (Far : Price; Near : Price) return Spread is
     (Far - Near)
   with
     Pre => Positive (Far) and Positive (Near);

   --  #26: SpreadMove = Current - Reference.
   function Spread_Move
     (Current   : Spread;
      Reference : Spread) return Spread
   is (Current - Reference);

   --  #26: LongPayoffScaled = R * SpreadMove.
   function Long_Payoff_Scaled
     (Reference_Notional : Amount;
      Move               : Spread) return Signed_Amount
   is (Reference_Notional * Move)
   with
     Pre => Nonnegative (Reference_Notional);

   function Short_Payoff_Scaled
     (Reference_Notional : Amount;
      Move               : Spread) return Signed_Amount
   is (-Long_Payoff_Scaled (Reference_Notional, Move))
   with
     Pre => Nonnegative (Reference_Notional);

   function Long_Wins (Payoff : Signed_Amount) return Boolean is
     (Payoff > 0);

   function Flat (Payoff : Signed_Amount) return Boolean is
     (Payoff = 0);

   function Short_Wins (Payoff : Signed_Amount) return Boolean is
     (Payoff < 0);

   --  #26: Transfer and Remainder witness floor(AbsPayoffScaled / P).
   function Valid_Transfer_Quotient
     (Abs_Payoff_Scaled : Amount;
      Settlement_Price  : Price;
      Transfer          : Amount;
      Remainder         : Amount) return Boolean
   is
     (Transfer * Settlement_Price + Remainder = Abs_Payoff_Scaled
      and Remainder >= 0
      and Remainder < Settlement_Price)
   with
     Pre =>
       Nonnegative (Abs_Payoff_Scaled)
       and Positive (Settlement_Price)
       and Nonnegative (Transfer)
       and Nonnegative (Remainder);

   function Paid_BTC
     (Losing_Collateral : Amount;
      Transfer          : Amount) return Amount
   is (Min (Losing_Collateral, Transfer))
   with
     Pre => Nonnegative (Losing_Collateral) and Nonnegative (Transfer);

   function Long_Output_Long_Wins
     (Long_Q   : Amount;
      Short_Q  : Amount;
      Transfer : Amount) return Amount
   is (Long_Q + Paid_BTC (Short_Q, Transfer))
   with
     Pre =>
       Nonnegative (Long_Q)
       and Nonnegative (Short_Q)
       and Nonnegative (Transfer);

   function Short_Output_Long_Wins
     (Short_Q  : Amount;
      Transfer : Amount) return Amount
   is (Short_Q - Paid_BTC (Short_Q, Transfer))
   with
     Pre => Nonnegative (Short_Q) and Nonnegative (Transfer);

   function Long_Output_Short_Wins
     (Long_Q   : Amount;
      Transfer : Amount) return Amount
   is (Long_Q - Paid_BTC (Long_Q, Transfer))
   with
     Pre => Nonnegative (Long_Q) and Nonnegative (Transfer);

   function Short_Output_Short_Wins
     (Long_Q   : Amount;
      Short_Q  : Amount;
      Transfer : Amount) return Amount
   is (Short_Q + Paid_BTC (Long_Q, Transfer))
   with
     Pre =>
       Nonnegative (Long_Q)
       and Nonnegative (Short_Q)
       and Nonnegative (Transfer);

   --  #26: MarginOK(Q, R, H, P) = Q * P >= R * H.
   function Margin_OK
     (Side_Collateral   : Amount;
      Reference_Notional : Amount;
      Stress_Move        : Amount;
      Roll_Price         : Price) return Boolean
   is
     (Side_Collateral * Roll_Price
      >= Reference_Notional * Stress_Move)
   with
     Pre =>
       Nonnegative (Side_Collateral)
       and Nonnegative (Reference_Notional)
       and Nonnegative (Stress_Move)
       and Positive (Roll_Price);

   --  #26: Ref_{i+1} = X_i.
   function Roll_Reference (Current_Spread : Spread) return Spread is
     (Current_Spread);

   function Period_Payoff_Scaled
     (Reference_Notional : Amount;
      Current_Spread     : Spread;
      Reference_Spread   : Spread) return Signed_Amount
   is
     (Long_Payoff_Scaled
        (Reference_Notional,
         Spread_Move (Current_Spread, Reference_Spread)))
   with
     Pre => Nonnegative (Reference_Notional);

   procedure Prove_Basis_Change_Identity
     (F0 : Price;
      S0 : Price;
      F1 : Price;
      S1 : Price)
   with
     Global => null,
     Pre =>
       Positive (F0)
       and Positive (S0)
       and Positive (F1)
       and Positive (S1),
     Post =>
       Basis (F1, S1) - Basis (F0, S0)
       =
       (F1 - F0) - (S1 - S0);

   procedure Prove_Calendar_Change_Identity
     (Far0  : Price;
      Near0 : Price;
      Far1  : Price;
      Near1 : Price)
   with
     Global => null,
     Pre =>
       Positive (Far0)
       and Positive (Near0)
       and Positive (Far1)
       and Positive (Near1),
     Post =>
       Calendar (Far1, Near1) - Calendar (Far0, Near0)
       =
       (Far1 - Far0) - (Near1 - Near0);

   procedure Prove_Basis_Payoff_Specialization
     (Reference_Notional : Amount;
      F0                 : Price;
      S0                 : Price;
      F1                 : Price;
      S1                 : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Reference_Notional)
       and Positive (F0)
       and Positive (S0)
       and Positive (F1)
       and Positive (S1),
     Post =>
       Period_Payoff_Scaled
         (Reference_Notional, Basis (F1, S1), Basis (F0, S0))
       =
       Reference_Notional * ((F1 - F0) - (S1 - S0));

   procedure Prove_Calendar_Payoff_Specialization
     (Reference_Notional : Amount;
      Far0               : Price;
      Near0              : Price;
      Far1               : Price;
      Near1              : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Reference_Notional)
       and Positive (Far0)
       and Positive (Near0)
       and Positive (Far1)
       and Positive (Near1),
     Post =>
       Period_Payoff_Scaled
         (Reference_Notional,
          Calendar (Far1, Near1),
          Calendar (Far0, Near0))
       =
       Reference_Notional * ((Far1 - Far0) - (Near1 - Near0));

   procedure Prove_Long_Short_Zero_Sum
     (Reference_Notional : Amount;
      Move               : Spread)
   with
     Global => null,
     Pre => Nonnegative (Reference_Notional),
     Post =>
       Long_Payoff_Scaled (Reference_Notional, Move)
       + Short_Payoff_Scaled (Reference_Notional, Move)
       = 0;

   procedure Prove_Branch_Coverage_Disjointness (Payoff : Signed_Amount)
   with
     Global => null,
     Post =>
       (Long_Wins (Payoff) or Flat (Payoff) or Short_Wins (Payoff))
       and not (Long_Wins (Payoff) and Flat (Payoff))
       and not (Long_Wins (Payoff) and Short_Wins (Payoff))
       and not (Flat (Payoff) and Short_Wins (Payoff));

   procedure Prove_Abs_Nonnegative (Payoff : Signed_Amount)
   with
     Global => null,
     Post => Abs_Signed (Payoff) >= 0;

   procedure Prove_Transfer_Quotient_Bounds
     (Abs_Payoff_Scaled : Amount;
      Settlement_Price  : Price;
      Transfer          : Amount;
      Remainder         : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Abs_Payoff_Scaled)
       and then Positive (Settlement_Price)
       and then Nonnegative (Transfer)
       and then Nonnegative (Remainder)
       and then Valid_Transfer_Quotient
         (Abs_Payoff_Scaled, Settlement_Price, Transfer, Remainder),
     Post =>
       Transfer * Settlement_Price <= Abs_Payoff_Scaled
       and Abs_Payoff_Scaled - Transfer * Settlement_Price < Settlement_Price;

   procedure Prove_Zero_Payoff_Zero_Transfer
     (Payoff           : Signed_Amount;
      Settlement_Price : Price;
      Transfer         : Amount;
      Remainder        : Amount)
   with
     Global => null,
     Pre =>
       Payoff = 0
       and then Positive (Settlement_Price)
       and then Nonnegative (Transfer)
       and then Nonnegative (Remainder)
       and then Valid_Transfer_Quotient
         (Abs_Signed (Payoff), Settlement_Price, Transfer, Remainder),
     Post => Transfer = 0 and Remainder = 0;

   procedure Prove_Paid_BTC_Bounded
     (Losing_Collateral : Amount;
      Transfer          : Amount)
   with
     Global => null,
     Pre => Nonnegative (Losing_Collateral) and Nonnegative (Transfer),
     Post =>
       Paid_BTC (Losing_Collateral, Transfer) <= Losing_Collateral
       and Paid_BTC (Losing_Collateral, Transfer) <= Transfer
       and Paid_BTC (Losing_Collateral, Transfer) >= 0;

   procedure Prove_Long_Wins_Solvent_Settlement
     (Long_Q   : Amount;
      Short_Q  : Amount;
      Transfer : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Q)
       and Nonnegative (Short_Q)
       and Nonnegative (Transfer)
       and Transfer <= Short_Q,
     Post =>
       Long_Output_Long_Wins (Long_Q, Short_Q, Transfer) = Long_Q + Transfer
       and Short_Output_Long_Wins (Short_Q, Transfer) = Short_Q - Transfer
       and Long_Output_Long_Wins (Long_Q, Short_Q, Transfer)
         + Short_Output_Long_Wins (Short_Q, Transfer)
         = Long_Q + Short_Q;

   procedure Prove_Short_Wins_Solvent_Settlement
     (Long_Q   : Amount;
      Short_Q  : Amount;
      Transfer : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Q)
       and Nonnegative (Short_Q)
       and Nonnegative (Transfer)
       and Transfer <= Long_Q,
     Post =>
       Long_Output_Short_Wins (Long_Q, Transfer) = Long_Q - Transfer
       and Short_Output_Short_Wins (Long_Q, Short_Q, Transfer)
         = Short_Q + Transfer
       and Long_Output_Short_Wins (Long_Q, Transfer)
         + Short_Output_Short_Wins (Long_Q, Short_Q, Transfer)
         = Long_Q + Short_Q;

   procedure Prove_Long_Wins_Capped_Settlement
     (Long_Q   : Amount;
      Short_Q  : Amount;
      Transfer : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Q)
       and Nonnegative (Short_Q)
       and Nonnegative (Transfer)
       and Transfer > Short_Q,
     Post =>
       Long_Output_Long_Wins (Long_Q, Short_Q, Transfer) = Long_Q + Short_Q
       and Short_Output_Long_Wins (Short_Q, Transfer) = 0
       and Long_Output_Long_Wins (Long_Q, Short_Q, Transfer)
         + Short_Output_Long_Wins (Short_Q, Transfer)
         = Long_Q + Short_Q;

   procedure Prove_Short_Wins_Capped_Settlement
     (Long_Q   : Amount;
      Short_Q  : Amount;
      Transfer : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Q)
       and Nonnegative (Short_Q)
       and Nonnegative (Transfer)
       and Transfer > Long_Q,
     Post =>
       Long_Output_Short_Wins (Long_Q, Transfer) = 0
       and Short_Output_Short_Wins (Long_Q, Short_Q, Transfer)
         = Short_Q + Long_Q
       and Long_Output_Short_Wins (Long_Q, Transfer)
         + Short_Output_Short_Wins (Long_Q, Short_Q, Transfer)
         = Long_Q + Short_Q;

   procedure Prove_Flat_Settlement_Preserves_Balances
     (Long_Q  : Amount;
      Short_Q : Amount)
   with
     Global => null,
     Pre => Nonnegative (Long_Q) and Nonnegative (Short_Q),
     Post => Long_Q + Short_Q = Long_Q + Short_Q;

   procedure Prove_Margin_OK_Definition
     (Side_Collateral    : Amount;
      Reference_Notional : Amount;
      Stress_Move        : Amount;
      Roll_Price         : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Side_Collateral)
       and Nonnegative (Reference_Notional)
       and Nonnegative (Stress_Move)
       and Positive (Roll_Price),
     Post =>
       Margin_OK
         (Side_Collateral, Reference_Notional, Stress_Move, Roll_Price)
       =
       (Side_Collateral * Roll_Price
        >= Reference_Notional * Stress_Move);

   procedure Prove_Reduced_Notional_Preserves_Margin
     (Side_Collateral    : Amount;
      Reference_Notional : Amount;
      Reduced_Notional   : Amount;
      Stress_Move        : Amount;
      Roll_Price         : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Side_Collateral)
       and then Nonnegative (Reference_Notional)
       and then Nonnegative (Reduced_Notional)
       and then Nonnegative (Stress_Move)
       and then Positive (Roll_Price)
       and then Reduced_Notional <= Reference_Notional
       and then Margin_OK
         (Side_Collateral, Reference_Notional, Stress_Move, Roll_Price),
     Post =>
       Margin_OK
         (Side_Collateral, Reduced_Notional, Stress_Move, Roll_Price);

   procedure Prove_Roll_Reference_Update
     (Reference_Notional : Amount;
      Current_Spread     : Spread;
      Next_Spread        : Spread)
   with
     Global => null,
     Pre => Nonnegative (Reference_Notional),
     Post =>
       Period_Payoff_Scaled
         (Reference_Notional, Next_Spread, Roll_Reference (Current_Spread))
       =
       Reference_Notional * (Next_Spread - Current_Spread);

   procedure Prove_Two_Step_Telescoping
     (Reference_Notional : Amount;
      X0                 : Spread;
      X1                 : Spread;
      X2                 : Spread)
   with
     Global => null,
     Pre => Nonnegative (Reference_Notional),
     Post =>
       Reference_Notional * (X1 - X0)
       + Reference_Notional * (X2 - X1)
       =
       Reference_Notional * (X2 - X0);
end Basis_Calendar_Rolls_Algebra;
