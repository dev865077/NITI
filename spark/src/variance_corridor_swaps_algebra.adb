pragma SPARK_Mode (On);

package body Variance_Corridor_Swaps_Algebra is
   procedure Prove_Term_Nonnegative_And_Den_Positive
     (S_Prev : Price;
      S_Cur  : Price) is
      Diff : constant Amount := Price_Delta_Abs (S_Prev, S_Cur);
   begin
      pragma Assert (Diff >= 0);
      pragma Assert (Term_Num (S_Prev, S_Cur) = Diff * Diff);
      pragma Assert (Term_Num (S_Prev, S_Cur) >= 0);
      pragma Assert (Term_Den (S_Prev) = S_Prev * S_Prev);
      pragma Assert (Term_Den (S_Prev) > 0);
   end Prove_Term_Nonnegative_And_Den_Positive;

   procedure Prove_Next_Var_Den_Positive
     (Old_Den : Amount;
      T_Den   : Amount) is
   begin
      pragma Assert (Next_Var_Den (Old_Den, T_Den) = Old_Den * T_Den);
      pragma Assert (Next_Var_Den (Old_Den, T_Den) > 0);
   end Prove_Next_Var_Den_Positive;

   procedure Prove_Next_Var_Num_Nonnegative
     (Old_Num : Amount;
      Old_Den : Amount;
      T_Num   : Amount;
      T_Den   : Amount) is
   begin
      pragma Assert (Old_Num * T_Den >= 0);
      pragma Assert (T_Num * Old_Den >= 0);
      pragma Assert (Next_Var_Num (Old_Num, Old_Den, T_Num, T_Den) >= 0);
   end Prove_Next_Var_Num_Nonnegative;

   procedure Prove_Variance_Monotone
     (Old_Num : Amount;
      Old_Den : Amount;
      T_Num   : Amount;
      T_Den   : Amount) is
      New_Num : constant Amount :=
        Next_Var_Num (Old_Num, Old_Den, T_Num, T_Den);
      New_Den : constant Amount := Next_Var_Den (Old_Den, T_Den);
   begin
      pragma Assert
        (New_Num * Old_Den =
         Old_Num * T_Den * Old_Den + T_Num * Old_Den * Old_Den);
      pragma Assert (Old_Num * New_Den = Old_Num * Old_Den * T_Den);
      pragma Assert
        (New_Num * Old_Den - Old_Num * New_Den
         = T_Num * Old_Den * Old_Den);
      pragma Assert (T_Num * Old_Den * Old_Den >= 0);
      pragma Assert (New_Num * Old_Den >= Old_Num * New_Den);
   end Prove_Variance_Monotone;

   procedure Prove_Corridor_Branch_Coverage_Disjointness
     (S_Cur : Price;
      Lower : Price;
      Upper : Price) is
   begin
      if S_Cur < Lower then
         pragma Assert (Exclude_Corridor (S_Cur, Lower, Upper));
         pragma Assert (not Include_Corridor (S_Cur, Lower, Upper));
      elsif S_Cur <= Upper then
         pragma Assert (Include_Corridor (S_Cur, Lower, Upper));
         pragma Assert (not Exclude_Corridor (S_Cur, Lower, Upper));
      else
         pragma Assert (Exclude_Corridor (S_Cur, Lower, Upper));
         pragma Assert (not Include_Corridor (S_Cur, Lower, Upper));
      end if;
   end Prove_Corridor_Branch_Coverage_Disjointness;

   procedure Prove_Corridor_Term_Bounds
     (T_Num   : Amount;
      Include : Boolean) is
   begin
      if Include then
         pragma Assert (Corridor_Term_Num (T_Num, Include) = T_Num);
      else
         pragma Assert (Corridor_Term_Num (T_Num, Include) = 0);
      end if;
      pragma Assert (Corridor_Term_Num (T_Num, Include) >= 0);
      pragma Assert (Corridor_Term_Num (T_Num, Include) <= T_Num);
   end Prove_Corridor_Term_Bounds;

   procedure Prove_Excluded_Corridor_Leaves_Value_Unchanged
     (Old_Num : Amount;
      Old_Den : Amount;
      T_Num   : Amount;
      T_Den   : Amount) is
      Corr_T : constant Amount := Corridor_Term_Num (T_Num, False);
      New_Num : constant Amount := Next_Var_Num
        (Old_Num, Old_Den, Corr_T, T_Den);
      New_Den : constant Amount := Next_Var_Den (Old_Den, T_Den);
   begin
      pragma Assert (Corr_T = 0);
      pragma Assert (New_Num = Old_Num * T_Den);
      pragma Assert (New_Den = Old_Den * T_Den);
      pragma Assert (New_Num * Old_Den = Old_Num * New_Den);
   end Prove_Excluded_Corridor_Leaves_Value_Unchanged;

   procedure Prove_Included_Corridor_Matches_Full
     (T_Num : Amount) is
   begin
      pragma Assert (Corridor_Term_Num (T_Num, True) = T_Num);
   end Prove_Included_Corridor_Matches_Full;

   procedure Prove_Corridor_Bounded_By_Full_One_Step
     (Corr_Num  : Amount;
      Corr_Den  : Amount;
      Full_Num  : Amount;
      Full_Den  : Amount;
      Corr_TNum : Amount;
      Full_TNum : Amount;
      T_Den     : Amount) is
      Corr_New_Num : constant Amount :=
        Next_Var_Num (Corr_Num, Corr_Den, Corr_TNum, T_Den);
      Corr_New_Den : constant Amount := Next_Var_Den (Corr_Den, T_Den);
      Full_New_Num : constant Amount :=
        Next_Var_Num (Full_Num, Full_Den, Full_TNum, T_Den);
      Full_New_Den : constant Amount := Next_Var_Den (Full_Den, T_Den);
   begin
      pragma Assert
        (Corr_New_Num * Full_New_Den =
         (Corr_Num * T_Den + Corr_TNum * Corr_Den) * Full_Den * T_Den);
      pragma Assert
        (Full_New_Num * Corr_New_Den =
         (Full_Num * T_Den + Full_TNum * Full_Den) * Corr_Den * T_Den);
      pragma Assert
        (Corr_Num * Full_Den * T_Den
         <= Full_Num * Corr_Den * T_Den);
      pragma Assert
        (Corr_TNum * Corr_Den * Full_Den
         <= Full_TNum * Full_Den * Corr_Den);
      pragma Assert
        ((Corr_Num * T_Den + Corr_TNum * Corr_Den) * Full_Den
         <=
         (Full_Num * T_Den + Full_TNum * Full_Den) * Corr_Den);
      pragma Assert (T_Den > 0);
      pragma Assert (Corr_New_Num * Full_New_Den
                     <= Full_New_Num * Corr_New_Den);
   end Prove_Corridor_Bounded_By_Full_One_Step;

   procedure Prove_Payoff_Den_Positive
     (Var_Den    : Amount;
      Strike_Den : Amount) is
   begin
      pragma Assert (Payoff_Den (Var_Den, Strike_Den)
                     = Var_Den * Strike_Den);
      pragma Assert (Payoff_Den (Var_Den, Strike_Den) > 0);
   end Prove_Payoff_Den_Positive;

   procedure Prove_Long_Short_Zero_Sum
     (P_Num : Amount) is
   begin
      pragma Assert (P_Num + (-P_Num) = 0);
   end Prove_Long_Short_Zero_Sum;

   procedure Prove_Strike_Equality_Zero_Payoff
     (Notional_Var_Cents : Amount;
      Var_Num            : Amount;
      Var_Den            : Amount;
      Strike_Num         : Amount;
      Strike_Den         : Amount) is
   begin
      pragma Assert (Var_Num * Strike_Den - Strike_Num * Var_Den = 0);
      pragma Assert
        (Payoff_Num
           (Notional_Var_Cents, Var_Num, Var_Den, Strike_Num, Strike_Den)
         = 0);
   end Prove_Strike_Equality_Zero_Payoff;

   procedure Prove_Claim_Ceil_Covers
     (Abs_Payoff_Num : Amount;
      P_Den          : Amount;
      Settlement     : Price;
      Claim_Sats     : Amount) is
   begin
      pragma Assert
        (Claim_Sats * P_Den * Settlement >= Abs_Payoff_Num * SAT);
   end Prove_Claim_Ceil_Covers;

   procedure Prove_Claim_Rounding_Positive
     (Abs_Payoff_Num : Amount;
      P_Den          : Amount;
      Settlement     : Price;
      Claim_Sats     : Amount) is
      Unit : constant Amount := P_Den * Settlement;
   begin
      pragma Assert (Unit > 0);
      pragma Assert (Claim_Sats * Unit >= Abs_Payoff_Num * SAT);
      if Claim_Sats = 0 then
         pragma Assert (Claim_Sats * Unit = 0);
         pragma Assert (Abs_Payoff_Num > 0);
      else
         pragma Assert ((Claim_Sats - 1) * Unit < Abs_Payoff_Num * SAT);
         pragma Assert (Claim_Sats * Unit =
                        (Claim_Sats - 1) * Unit + Unit);
         pragma Assert (Claim_Sats * Unit < Abs_Payoff_Num * SAT + Unit);
         pragma Assert (Claim_Sats * Unit - Abs_Payoff_Num * SAT < Unit);
      end if;
      pragma Assert (Claim_Sats * Unit - Abs_Payoff_Num * SAT >= 0);
   end Prove_Claim_Rounding_Positive;

   procedure Prove_Claim_Rounding_Zero
     (Abs_Payoff_Num : Amount;
      P_Den          : Amount;
      Settlement     : Price;
      Claim_Sats     : Amount) is
      Unit : constant Amount := P_Den * Settlement;
   begin
      pragma Assert (Abs_Payoff_Num = 0);
      if Claim_Sats = 0 then
         pragma Assert (Claim_Sats * Unit = 0);
      else
         pragma Assert ((Claim_Sats - 1) * Unit < Abs_Payoff_Num * SAT);
         pragma Assert (Claim_Sats - 1 >= 0);
         pragma Assert ((Claim_Sats - 1) * Unit >= 0);
      end if;
      pragma Assert (Claim_Sats = 0);
      pragma Assert (Claim_Sats * Unit - Abs_Payoff_Num * SAT = 0);
   end Prove_Claim_Rounding_Zero;

   procedure Prove_Long_Wins_Settlement_Conserves
     (Long_Q     : Amount;
      Short_Q    : Amount;
      Claim_Sats : Amount) is
      Paid : constant Amount := Paid_BTC (Short_Q, Claim_Sats);
   begin
      if Claim_Sats <= Short_Q then
         pragma Assert (Paid = Claim_Sats);
      else
         pragma Assert (Paid = Short_Q);
      end if;
      pragma Assert (Paid >= 0);
      pragma Assert (Paid <= Short_Q);
      pragma Assert (Short_Q - Paid >= 0);
      pragma Assert (Long_Q + Paid + (Short_Q - Paid) = Long_Q + Short_Q);
   end Prove_Long_Wins_Settlement_Conserves;

   procedure Prove_Short_Wins_Settlement_Conserves
     (Long_Q     : Amount;
      Short_Q    : Amount;
      Claim_Sats : Amount) is
      Paid : constant Amount := Paid_BTC (Long_Q, Claim_Sats);
   begin
      if Claim_Sats <= Long_Q then
         pragma Assert (Paid = Claim_Sats);
      else
         pragma Assert (Paid = Long_Q);
      end if;
      pragma Assert (Paid >= 0);
      pragma Assert (Paid <= Long_Q);
      pragma Assert (Long_Q - Paid >= 0);
      pragma Assert ((Long_Q - Paid) + Short_Q + Paid = Long_Q + Short_Q);
   end Prove_Short_Wins_Settlement_Conserves;

   procedure Prove_Zero_Payoff_Settlement_Conserves
     (Long_Q  : Amount;
      Short_Q : Amount) is
   begin
      pragma Assert (Long_Q + Short_Q = Long_Q + Short_Q);
   end Prove_Zero_Payoff_Settlement_Conserves;
end Variance_Corridor_Swaps_Algebra;
