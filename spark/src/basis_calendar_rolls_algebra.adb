pragma SPARK_Mode (On);

package body Basis_Calendar_Rolls_Algebra is
   procedure Prove_Basis_Change_Identity
     (F0 : Price;
      S0 : Price;
      F1 : Price;
      S1 : Price) is
   begin
      pragma Assert (Basis (F1, S1) = F1 - S1);
      pragma Assert (Basis (F0, S0) = F0 - S0);
      pragma Assert
        (Basis (F1, S1) - Basis (F0, S0)
         = F1 - S1 - F0 + S0);
      pragma Assert
        (F1 - S1 - F0 + S0 = (F1 - F0) - (S1 - S0));
   end Prove_Basis_Change_Identity;

   procedure Prove_Calendar_Change_Identity
     (Far0  : Price;
      Near0 : Price;
      Far1  : Price;
      Near1 : Price) is
   begin
      pragma Assert (Calendar (Far1, Near1) = Far1 - Near1);
      pragma Assert (Calendar (Far0, Near0) = Far0 - Near0);
      pragma Assert
        (Calendar (Far1, Near1) - Calendar (Far0, Near0)
         = Far1 - Near1 - Far0 + Near0);
      pragma Assert
        (Far1 - Near1 - Far0 + Near0
         = (Far1 - Far0) - (Near1 - Near0));
   end Prove_Calendar_Change_Identity;

   procedure Prove_Basis_Payoff_Specialization
     (Reference_Notional : Amount;
      F0                 : Price;
      S0                 : Price;
      F1                 : Price;
      S1                 : Price) is
   begin
      pragma Assert
        (Basis (F1, S1) - Basis (F0, S0)
         = (F1 - F0) - (S1 - S0));
      pragma Assert
        (Spread_Move (Basis (F1, S1), Basis (F0, S0))
         = (F1 - F0) - (S1 - S0));
      pragma Assert
        (Period_Payoff_Scaled
           (Reference_Notional, Basis (F1, S1), Basis (F0, S0))
         =
         Reference_Notional * ((F1 - F0) - (S1 - S0)));
   end Prove_Basis_Payoff_Specialization;

   procedure Prove_Calendar_Payoff_Specialization
     (Reference_Notional : Amount;
      Far0               : Price;
      Near0              : Price;
      Far1               : Price;
      Near1              : Price) is
   begin
      pragma Assert
        (Calendar (Far1, Near1) - Calendar (Far0, Near0)
         = (Far1 - Far0) - (Near1 - Near0));
      pragma Assert
        (Spread_Move (Calendar (Far1, Near1), Calendar (Far0, Near0))
         = (Far1 - Far0) - (Near1 - Near0));
      pragma Assert
        (Period_Payoff_Scaled
           (Reference_Notional,
            Calendar (Far1, Near1),
            Calendar (Far0, Near0))
         =
         Reference_Notional * ((Far1 - Far0) - (Near1 - Near0)));
   end Prove_Calendar_Payoff_Specialization;

   procedure Prove_Long_Short_Zero_Sum
     (Reference_Notional : Amount;
      Move               : Spread) is
   begin
      pragma Assert
        (Short_Payoff_Scaled (Reference_Notional, Move)
         =
         -Long_Payoff_Scaled (Reference_Notional, Move));
      pragma Assert
        (Long_Payoff_Scaled (Reference_Notional, Move)
         + Short_Payoff_Scaled (Reference_Notional, Move)
         = 0);
   end Prove_Long_Short_Zero_Sum;

   procedure Prove_Branch_Coverage_Disjointness
     (Payoff : Signed_Amount) is
   begin
      if Payoff > 0 then
         pragma Assert (Long_Wins (Payoff));
         pragma Assert (not Flat (Payoff));
         pragma Assert (not Short_Wins (Payoff));
      elsif Payoff = 0 then
         pragma Assert (not Long_Wins (Payoff));
         pragma Assert (Flat (Payoff));
         pragma Assert (not Short_Wins (Payoff));
      else
         pragma Assert (not Long_Wins (Payoff));
         pragma Assert (not Flat (Payoff));
         pragma Assert (Short_Wins (Payoff));
      end if;
   end Prove_Branch_Coverage_Disjointness;

   procedure Prove_Abs_Nonnegative (Payoff : Signed_Amount) is
   begin
      if Payoff >= 0 then
         pragma Assert (Abs_Signed (Payoff) = Payoff);
      else
         pragma Assert (Abs_Signed (Payoff) = -Payoff);
      end if;
      pragma Assert (Abs_Signed (Payoff) >= 0);
   end Prove_Abs_Nonnegative;

   procedure Prove_Transfer_Quotient_Bounds
     (Abs_Payoff_Scaled : Amount;
      Settlement_Price  : Price;
      Transfer          : Amount;
      Remainder         : Amount) is
   begin
      pragma Assert
        (Transfer * Settlement_Price + Remainder
         = Abs_Payoff_Scaled);
      pragma Assert (Remainder >= 0);
      pragma Assert (Remainder < Settlement_Price);
      pragma Assert
        (Transfer * Settlement_Price <= Abs_Payoff_Scaled);
      pragma Assert
        (Abs_Payoff_Scaled - Transfer * Settlement_Price
         = Remainder);
      pragma Assert
        (Abs_Payoff_Scaled - Transfer * Settlement_Price
         < Settlement_Price);
   end Prove_Transfer_Quotient_Bounds;

   procedure Prove_Zero_Payoff_Zero_Transfer
     (Payoff           : Signed_Amount;
      Settlement_Price : Price;
      Transfer         : Amount;
      Remainder        : Amount) is
   begin
      pragma Assert (Abs_Signed (Payoff) = 0);
      pragma Assert
        (Transfer * Settlement_Price + Remainder = 0);
      pragma Assert (Transfer * Settlement_Price >= 0);
      pragma Assert (Remainder >= 0);
      pragma Assert (Transfer * Settlement_Price = 0);
      pragma Assert (Remainder = 0);
      pragma Assert (Transfer = 0);
   end Prove_Zero_Payoff_Zero_Transfer;

   procedure Prove_Paid_BTC_Bounded
     (Losing_Collateral : Amount;
      Transfer          : Amount) is
   begin
      if Losing_Collateral <= Transfer then
         pragma Assert
           (Paid_BTC (Losing_Collateral, Transfer) = Losing_Collateral);
      else
         pragma Assert (Paid_BTC (Losing_Collateral, Transfer) = Transfer);
      end if;
      pragma Assert (Paid_BTC (Losing_Collateral, Transfer) >= 0);
      pragma Assert
        (Paid_BTC (Losing_Collateral, Transfer) <= Losing_Collateral);
      pragma Assert (Paid_BTC (Losing_Collateral, Transfer) <= Transfer);
   end Prove_Paid_BTC_Bounded;

   procedure Prove_Long_Wins_Solvent_Settlement
     (Long_Q   : Amount;
      Short_Q  : Amount;
      Transfer : Amount) is
   begin
      pragma Assert (Paid_BTC (Short_Q, Transfer) = Transfer);
      pragma Assert
        (Long_Output_Long_Wins (Long_Q, Short_Q, Transfer)
         = Long_Q + Transfer);
      pragma Assert
        (Short_Output_Long_Wins (Short_Q, Transfer)
         = Short_Q - Transfer);
      pragma Assert
        (Long_Output_Long_Wins (Long_Q, Short_Q, Transfer)
         + Short_Output_Long_Wins (Short_Q, Transfer)
         = Long_Q + Short_Q);
   end Prove_Long_Wins_Solvent_Settlement;

   procedure Prove_Short_Wins_Solvent_Settlement
     (Long_Q   : Amount;
      Short_Q  : Amount;
      Transfer : Amount) is
   begin
      pragma Assert (Paid_BTC (Long_Q, Transfer) = Transfer);
      pragma Assert
        (Long_Output_Short_Wins (Long_Q, Transfer)
         = Long_Q - Transfer);
      pragma Assert
        (Short_Output_Short_Wins (Long_Q, Short_Q, Transfer)
         = Short_Q + Transfer);
      pragma Assert
        (Long_Output_Short_Wins (Long_Q, Transfer)
         + Short_Output_Short_Wins (Long_Q, Short_Q, Transfer)
         = Long_Q + Short_Q);
   end Prove_Short_Wins_Solvent_Settlement;

   procedure Prove_Long_Wins_Capped_Settlement
     (Long_Q   : Amount;
      Short_Q  : Amount;
      Transfer : Amount) is
   begin
      pragma Assert (Paid_BTC (Short_Q, Transfer) = Short_Q);
      pragma Assert
        (Long_Output_Long_Wins (Long_Q, Short_Q, Transfer)
         = Long_Q + Short_Q);
      pragma Assert (Short_Output_Long_Wins (Short_Q, Transfer) = 0);
      pragma Assert
        (Long_Output_Long_Wins (Long_Q, Short_Q, Transfer)
         + Short_Output_Long_Wins (Short_Q, Transfer)
         = Long_Q + Short_Q);
   end Prove_Long_Wins_Capped_Settlement;

   procedure Prove_Short_Wins_Capped_Settlement
     (Long_Q   : Amount;
      Short_Q  : Amount;
      Transfer : Amount) is
   begin
      pragma Assert (Paid_BTC (Long_Q, Transfer) = Long_Q);
      pragma Assert (Long_Output_Short_Wins (Long_Q, Transfer) = 0);
      pragma Assert
        (Short_Output_Short_Wins (Long_Q, Short_Q, Transfer)
         = Short_Q + Long_Q);
      pragma Assert
        (Long_Output_Short_Wins (Long_Q, Transfer)
         + Short_Output_Short_Wins (Long_Q, Short_Q, Transfer)
         = Long_Q + Short_Q);
   end Prove_Short_Wins_Capped_Settlement;

   procedure Prove_Flat_Settlement_Preserves_Balances
     (Long_Q  : Amount;
      Short_Q : Amount) is
   begin
      pragma Assert (Long_Q + Short_Q = Long_Q + Short_Q);
   end Prove_Flat_Settlement_Preserves_Balances;

   procedure Prove_Margin_OK_Definition
     (Side_Collateral    : Amount;
      Reference_Notional : Amount;
      Stress_Move        : Amount;
      Roll_Price         : Price) is
   begin
      pragma Assert
        (Margin_OK
           (Side_Collateral, Reference_Notional, Stress_Move, Roll_Price)
         =
         (Side_Collateral * Roll_Price
          >= Reference_Notional * Stress_Move));
   end Prove_Margin_OK_Definition;

   procedure Prove_Reduced_Notional_Preserves_Margin
     (Side_Collateral    : Amount;
      Reference_Notional : Amount;
      Reduced_Notional   : Amount;
      Stress_Move        : Amount;
      Roll_Price         : Price) is
   begin
      pragma Assert (Reduced_Notional * Stress_Move
                     <= Reference_Notional * Stress_Move);
      pragma Assert
        (Side_Collateral * Roll_Price
         >= Reference_Notional * Stress_Move);
      pragma Assert
        (Side_Collateral * Roll_Price
         >= Reduced_Notional * Stress_Move);
      pragma Assert
        (Margin_OK
           (Side_Collateral, Reduced_Notional, Stress_Move, Roll_Price));
   end Prove_Reduced_Notional_Preserves_Margin;

   procedure Prove_Roll_Reference_Update
     (Reference_Notional : Amount;
      Current_Spread     : Spread;
      Next_Spread        : Spread) is
   begin
      pragma Assert (Roll_Reference (Current_Spread) = Current_Spread);
      pragma Assert
        (Spread_Move (Next_Spread, Roll_Reference (Current_Spread))
         = Next_Spread - Current_Spread);
      pragma Assert
        (Period_Payoff_Scaled
           (Reference_Notional, Next_Spread, Roll_Reference (Current_Spread))
         =
         Reference_Notional * (Next_Spread - Current_Spread));
   end Prove_Roll_Reference_Update;

   procedure Prove_Two_Step_Telescoping
     (Reference_Notional : Amount;
      X0                 : Spread;
      X1                 : Spread;
      X2                 : Spread) is
   begin
      pragma Assert
        (Reference_Notional * (X1 - X0)
         + Reference_Notional * (X2 - X1)
         =
         Reference_Notional * X1
         - Reference_Notional * X0
         + Reference_Notional * X2
         - Reference_Notional * X1);
      pragma Assert
        (Reference_Notional * X1
         - Reference_Notional * X0
         + Reference_Notional * X2
         - Reference_Notional * X1
         =
         Reference_Notional * X2 - Reference_Notional * X0);
      pragma Assert
        (Reference_Notional * X2 - Reference_Notional * X0
         =
         Reference_Notional * (X2 - X0));
   end Prove_Two_Step_Telescoping;
end Basis_Calendar_Rolls_Algebra;
