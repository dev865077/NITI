pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Variance_Corridor_Swaps_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Price is Valid_Big_Integer;

   SAT : constant Amount := 100_000_000;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);

   function Min (A, B : Amount) return Amount is
     (if A <= B then A else B)
   with
     Pre => Nonnegative (A) and Nonnegative (B);

   function Abs_Value (X : Amount) return Amount is
     (if X >= 0 then X else -X);

   function Price_Delta_Abs
     (S_Prev : Price;
      S_Cur  : Price) return Amount
   is
     (if S_Cur >= S_Prev then S_Cur - S_Prev else S_Prev - S_Cur)
   with
     Pre => Positive (S_Prev) and Positive (S_Cur);

   --  #24: TermNum = (S_cur - S_prev)^2.
   function Term_Num
     (S_Prev : Price;
      S_Cur  : Price) return Amount
   is
     (Price_Delta_Abs (S_Prev, S_Cur)
      * Price_Delta_Abs (S_Prev, S_Cur))
   with
     Pre => Positive (S_Prev) and Positive (S_Cur);

   --  #24: TermDen = S_prev^2.
   function Term_Den (S_Prev : Price) return Amount is
     (S_Prev * S_Prev)
   with
     Pre => Positive (S_Prev);

   --  #24: NewNum = OldNum * TermDen + TermNum * OldDen.
   function Next_Var_Num
     (Old_Num  : Amount;
      Old_Den  : Amount;
      T_Num    : Amount;
      T_Den    : Amount) return Amount
   is (Old_Num * T_Den + T_Num * Old_Den)
   with
     Pre =>
       Nonnegative (Old_Num)
       and Positive (Old_Den)
       and Nonnegative (T_Num)
       and Positive (T_Den);

   --  #24: NewDen = OldDen * TermDen.
   function Next_Var_Den
     (Old_Den : Amount;
      T_Den   : Amount) return Amount
   is (Old_Den * T_Den)
   with
     Pre => Positive (Old_Den) and Positive (T_Den);

   function Include_Corridor
     (S_Cur : Price;
      Lower : Price;
      Upper : Price) return Boolean
   is (S_Cur >= Lower and S_Cur <= Upper)
   with
     Pre =>
       Positive (S_Cur)
       and Nonnegative (Lower)
       and Nonnegative (Upper)
       and Lower <= Upper;

   function Exclude_Corridor
     (S_Cur : Price;
      Lower : Price;
      Upper : Price) return Boolean
   is (S_Cur < Lower or S_Cur > Upper)
   with
     Pre =>
       Positive (S_Cur)
       and Nonnegative (Lower)
       and Nonnegative (Upper)
       and Lower <= Upper;

   --  #24: CorrTermNum = TermNum if included, otherwise 0.
   function Corridor_Term_Num
     (T_Num   : Amount;
      Include : Boolean) return Amount
   is (if Include then T_Num else 0)
   with
     Pre => Nonnegative (T_Num);

   --  #24: PayoffNum = N_var * (VarNum * K_den - K_num * VarDen).
   function Payoff_Num
     (Notional_Var_Cents : Amount;
      Var_Num            : Amount;
      Var_Den            : Amount;
      Strike_Num         : Amount;
      Strike_Den         : Amount) return Amount
   is
     (Notional_Var_Cents
      * (Var_Num * Strike_Den - Strike_Num * Var_Den))
   with
     Pre =>
       Nonnegative (Notional_Var_Cents)
       and Nonnegative (Var_Num)
       and Positive (Var_Den)
       and Nonnegative (Strike_Num)
       and Positive (Strike_Den);

   function Payoff_Den
     (Var_Den    : Amount;
      Strike_Den : Amount) return Amount
   is (Var_Den * Strike_Den)
   with
     Pre => Positive (Var_Den) and Positive (Strike_Den);

   function Valid_Claim_Ceil
     (Abs_Payoff_Num : Amount;
      P_Den          : Amount;
      Settlement     : Price;
      Claim_Sats     : Amount) return Boolean
   is
     (Claim_Sats * P_Den * Settlement >= Abs_Payoff_Num * SAT
      and then
        (Claim_Sats = 0
         or else (Claim_Sats - 1) * P_Den * Settlement
                 < Abs_Payoff_Num * SAT))
   with
     Pre =>
       Nonnegative (Abs_Payoff_Num)
       and Positive (P_Den)
       and Positive (Settlement)
       and Nonnegative (Claim_Sats);

   function Paid_BTC
     (Losing_Collateral : Amount;
      Claim_Sats        : Amount) return Amount
   is (Min (Losing_Collateral, Claim_Sats))
   with
     Pre => Nonnegative (Losing_Collateral) and Nonnegative (Claim_Sats);

   procedure Prove_Term_Nonnegative_And_Den_Positive
     (S_Prev : Price;
      S_Cur  : Price)
   with
     Global => null,
     Pre => Positive (S_Prev) and Positive (S_Cur),
     Post =>
       Term_Num (S_Prev, S_Cur) >= 0
       and Term_Den (S_Prev) > 0;

   procedure Prove_Next_Var_Den_Positive
     (Old_Den : Amount;
      T_Den   : Amount)
   with
     Global => null,
     Pre => Positive (Old_Den) and Positive (T_Den),
     Post => Next_Var_Den (Old_Den, T_Den) > 0;

   procedure Prove_Next_Var_Num_Nonnegative
     (Old_Num : Amount;
      Old_Den : Amount;
      T_Num   : Amount;
      T_Den   : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Old_Num)
       and Positive (Old_Den)
       and Nonnegative (T_Num)
       and Positive (T_Den),
     Post => Next_Var_Num (Old_Num, Old_Den, T_Num, T_Den) >= 0;

   procedure Prove_Variance_Monotone
     (Old_Num : Amount;
      Old_Den : Amount;
      T_Num   : Amount;
      T_Den   : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Old_Num)
       and Positive (Old_Den)
       and Nonnegative (T_Num)
       and Positive (T_Den),
     Post =>
       Next_Var_Num (Old_Num, Old_Den, T_Num, T_Den) * Old_Den
       >= Old_Num * Next_Var_Den (Old_Den, T_Den);

   procedure Prove_Corridor_Branch_Coverage_Disjointness
     (S_Cur : Price;
      Lower : Price;
      Upper : Price)
   with
     Global => null,
     Pre =>
       Positive (S_Cur)
       and Nonnegative (Lower)
       and Nonnegative (Upper)
       and Lower <= Upper,
     Post =>
       (Include_Corridor (S_Cur, Lower, Upper)
        or Exclude_Corridor (S_Cur, Lower, Upper))
       and not
         (Include_Corridor (S_Cur, Lower, Upper)
          and Exclude_Corridor (S_Cur, Lower, Upper));

   procedure Prove_Corridor_Term_Bounds
     (T_Num   : Amount;
      Include : Boolean)
   with
     Global => null,
     Pre => Nonnegative (T_Num),
     Post =>
       Corridor_Term_Num (T_Num, Include) >= 0
       and Corridor_Term_Num (T_Num, Include) <= T_Num;

   procedure Prove_Excluded_Corridor_Leaves_Value_Unchanged
     (Old_Num : Amount;
      Old_Den : Amount;
      T_Num   : Amount;
      T_Den   : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Old_Num)
       and Positive (Old_Den)
       and Nonnegative (T_Num)
       and Positive (T_Den),
     Post =>
       Next_Var_Num
         (Old_Num, Old_Den, Corridor_Term_Num (T_Num, False), T_Den)
       * Old_Den
       =
       Old_Num * Next_Var_Den (Old_Den, T_Den);

   procedure Prove_Included_Corridor_Matches_Full
     (T_Num : Amount)
   with
     Global => null,
     Pre => Nonnegative (T_Num),
     Post => Corridor_Term_Num (T_Num, True) = T_Num;

   procedure Prove_Corridor_Bounded_By_Full_One_Step
     (Corr_Num  : Amount;
      Corr_Den  : Amount;
      Full_Num  : Amount;
      Full_Den  : Amount;
      Corr_TNum : Amount;
      Full_TNum : Amount;
      T_Den     : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Corr_Num)
       and Positive (Corr_Den)
       and Nonnegative (Full_Num)
       and Positive (Full_Den)
       and Nonnegative (Corr_TNum)
       and Nonnegative (Full_TNum)
       and Positive (T_Den)
       and Corr_Num * Full_Den <= Full_Num * Corr_Den
       and Corr_TNum <= Full_TNum,
     Post =>
       Next_Var_Num (Corr_Num, Corr_Den, Corr_TNum, T_Den)
       * Next_Var_Den (Full_Den, T_Den)
       <=
       Next_Var_Num (Full_Num, Full_Den, Full_TNum, T_Den)
       * Next_Var_Den (Corr_Den, T_Den);

   procedure Prove_Payoff_Den_Positive
     (Var_Den    : Amount;
      Strike_Den : Amount)
   with
     Global => null,
     Pre => Positive (Var_Den) and Positive (Strike_Den),
     Post => Payoff_Den (Var_Den, Strike_Den) > 0;

   procedure Prove_Long_Short_Zero_Sum
     (P_Num : Amount)
   with
     Global => null,
     Post => P_Num + (-P_Num) = 0;

   procedure Prove_Strike_Equality_Zero_Payoff
     (Notional_Var_Cents : Amount;
      Var_Num            : Amount;
      Var_Den            : Amount;
      Strike_Num         : Amount;
      Strike_Den         : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Notional_Var_Cents)
       and Nonnegative (Var_Num)
       and Positive (Var_Den)
       and Nonnegative (Strike_Num)
       and Positive (Strike_Den)
       and Var_Num * Strike_Den = Strike_Num * Var_Den,
     Post =>
       Payoff_Num
         (Notional_Var_Cents, Var_Num, Var_Den, Strike_Num, Strike_Den)
       = 0;

   procedure Prove_Claim_Ceil_Covers
     (Abs_Payoff_Num : Amount;
      P_Den          : Amount;
      Settlement     : Price;
      Claim_Sats     : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Abs_Payoff_Num)
       and then Positive (P_Den)
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil
         (Abs_Payoff_Num, P_Den, Settlement, Claim_Sats),
     Post =>
       Claim_Sats * P_Den * Settlement >= Abs_Payoff_Num * SAT;

   procedure Prove_Claim_Rounding_Positive
     (Abs_Payoff_Num : Amount;
      P_Den          : Amount;
      Settlement     : Price;
      Claim_Sats     : Amount)
   with
     Global => null,
     Pre =>
       Positive (Abs_Payoff_Num)
       and then Positive (P_Den)
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil
         (Abs_Payoff_Num, P_Den, Settlement, Claim_Sats),
     Post =>
       Claim_Sats * P_Den * Settlement - Abs_Payoff_Num * SAT >= 0
       and
       Claim_Sats * P_Den * Settlement - Abs_Payoff_Num * SAT
       < P_Den * Settlement;

   procedure Prove_Claim_Rounding_Zero
     (Abs_Payoff_Num : Amount;
      P_Den          : Amount;
      Settlement     : Price;
      Claim_Sats     : Amount)
   with
     Global => null,
     Pre =>
       Abs_Payoff_Num = 0
       and then Positive (P_Den)
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil
         (Abs_Payoff_Num, P_Den, Settlement, Claim_Sats),
     Post =>
       Claim_Sats = 0
       and Claim_Sats * P_Den * Settlement - Abs_Payoff_Num * SAT = 0;

   procedure Prove_Long_Wins_Settlement_Conserves
     (Long_Q     : Amount;
      Short_Q    : Amount;
      Claim_Sats : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Q)
       and Nonnegative (Short_Q)
       and Nonnegative (Claim_Sats),
     Post =>
       Paid_BTC (Short_Q, Claim_Sats) >= 0
       and Paid_BTC (Short_Q, Claim_Sats) <= Short_Q
       and Long_Q + Paid_BTC (Short_Q, Claim_Sats)
         + (Short_Q - Paid_BTC (Short_Q, Claim_Sats))
         = Long_Q + Short_Q;

   procedure Prove_Short_Wins_Settlement_Conserves
     (Long_Q     : Amount;
      Short_Q    : Amount;
      Claim_Sats : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Long_Q)
       and Nonnegative (Short_Q)
       and Nonnegative (Claim_Sats),
     Post =>
       Paid_BTC (Long_Q, Claim_Sats) >= 0
       and Paid_BTC (Long_Q, Claim_Sats) <= Long_Q
       and (Long_Q - Paid_BTC (Long_Q, Claim_Sats))
         + Short_Q + Paid_BTC (Long_Q, Claim_Sats)
         = Long_Q + Short_Q;

   procedure Prove_Zero_Payoff_Settlement_Conserves
     (Long_Q  : Amount;
      Short_Q : Amount)
   with
     Global => null,
     Pre => Nonnegative (Long_Q) and Nonnegative (Short_Q),
     Post => Long_Q + Short_Q = Long_Q + Short_Q;
end Variance_Corridor_Swaps_Algebra;
