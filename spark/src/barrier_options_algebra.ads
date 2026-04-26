pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Barrier_Options_Algebra with
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

   --  #16: HitUp(S, H) = S >= H; equality belongs to touch.
   function Hit_Up
     (Settlement : Price;
      Barrier   : Price) return Boolean
   is (Settlement >= Barrier)
   with
     Pre => Positive (Settlement) and Nonnegative (Barrier);

   --  #16: MissUp(S, H) = S < H.
   function Miss_Up
     (Settlement : Price;
      Barrier   : Price) return Boolean
   is (Settlement < Barrier)
   with
     Pre => Positive (Settlement) and Nonnegative (Barrier);

   --  #16: HitDown(S, H) = S <= H; equality belongs to touch.
   function Hit_Down
     (Settlement : Price;
      Barrier   : Price) return Boolean
   is (Settlement <= Barrier)
   with
     Pre => Positive (Settlement) and Nonnegative (Barrier);

   --  #16: MissDown(S, H) = S > H.
   function Miss_Down
     (Settlement : Price;
      Barrier   : Price) return Boolean
   is (Settlement > Barrier)
   with
     Pre => Positive (Settlement) and Nonnegative (Barrier);

   --  #16: Touched_{i+1} = Touched_i or Hit(S_i, H).
   function Next_Touched
     (Touched : Boolean;
      Hit     : Boolean) return Boolean
   is (Touched or Hit);

   --  #16: Live_{i+1} = Live_i and Miss(S_i, H).
   function Next_Live
     (Live : Boolean;
      Miss : Boolean) return Boolean
   is (Live and Miss);

   --  #16: Pure observation transitions preserve collateral.
   function Next_Collateral (Collateral_Sats : Amount) return Amount is
     (Collateral_Sats)
   with
     Pre => Nonnegative (Collateral_Sats);

   --  #16: CallScaled(S_T, K, R) = R * (S_T - K) if S_T > K, else 0.
   function Call_Scaled
     (Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) return Amount
   is
     (if Settlement > Strike then Reference_Sats * (Settlement - Strike)
      else 0)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats);

   --  #16: PutScaled(S_T, K, R) = R * (K - S_T) if K > S_T, else 0.
   function Put_Scaled
     (Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) return Amount
   is
     (if Strike > Settlement then Reference_Sats * (Strike - Settlement)
      else 0)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats);

   --  #16: Knock-in pays vanilla only after touch activation.
   function Knock_In_Call_Scaled
     (Touched        : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) return Amount
   is
     (if Touched then Call_Scaled (Settlement, Strike, Reference_Sats)
      else 0)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats);

   function Knock_In_Put_Scaled
     (Touched        : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) return Amount
   is
     (if Touched then Put_Scaled (Settlement, Strike, Reference_Sats)
      else 0)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats);

   --  #16: Knock-out pays vanilla only while the live state remains true.
   function Knock_Out_Call_Scaled
     (Live           : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) return Amount
   is
     (if Live then Call_Scaled (Settlement, Strike, Reference_Sats)
      else 0)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats);

   function Knock_Out_Put_Scaled
     (Live           : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) return Amount
   is
     (if Live then Put_Scaled (Settlement, Strike, Reference_Sats)
      else 0)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats);

   --  #16: Digitals are scaled by SAT.
   function One_Touch_Scaled
     (Touched     : Boolean;
      Payout_Cents : Amount) return Amount
   is
     (if Touched then Payout_Cents * SAT else 0)
   with
     Pre => Nonnegative (Payout_Cents);

   function No_Touch_Scaled
     (Live         : Boolean;
      Payout_Cents : Amount) return Amount
   is
     (if Live then Payout_Cents * SAT else 0)
   with
     Pre => Nonnegative (Payout_Cents);

   --  #16: Immediate rebate is a digital payout converted at observation.
   function Rebate_Scaled (Payout_Cents : Amount) return Amount is
     (Payout_Cents * SAT)
   with
     Pre => Nonnegative (Payout_Cents);

   --  #16: ClaimBTC = ceil(PayoffScaled / S_T).
   function Valid_Claim_Ceil
     (Payoff_Scaled : Amount;
      Settlement    : Price;
      Claim_Sats    : Amount) return Boolean
   is
     (Claim_Sats * Settlement >= Payoff_Scaled
      and then
        (Claim_Sats = 0
         or else (Claim_Sats - 1) * Settlement < Payoff_Scaled))
   with
     Pre =>
       Nonnegative (Payoff_Scaled)
       and Positive (Settlement)
       and Nonnegative (Claim_Sats);

   function Option_Holder_BTC
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount) return Amount
   is (Min (Collateral_Sats, Claim_Sats))
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Claim_Sats);

   function Residual_BTC
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount) return Amount
   is (Collateral_Sats - Option_Holder_BTC (Collateral_Sats, Claim_Sats))
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Claim_Sats);

   function Two_Step_Touched
     (Initial_Touched : Boolean;
      Hit_0           : Boolean;
      Hit_1           : Boolean) return Boolean
   is
     (Next_Touched (Next_Touched (Initial_Touched, Hit_0), Hit_1));

   procedure Prove_Up_Barrier_Branch_Coverage
     (Settlement : Price;
      Barrier    : Price)
   with
     Global => null,
     Pre => Positive (Settlement) and Nonnegative (Barrier),
     Post =>
       (Hit_Up (Settlement, Barrier) or Miss_Up (Settlement, Barrier))
       and not (Hit_Up (Settlement, Barrier)
                and Miss_Up (Settlement, Barrier));

   procedure Prove_Down_Barrier_Branch_Coverage
     (Settlement : Price;
      Barrier    : Price)
   with
     Global => null,
     Pre => Positive (Settlement) and Nonnegative (Barrier),
     Post =>
       (Hit_Down (Settlement, Barrier) or Miss_Down (Settlement, Barrier))
       and not (Hit_Down (Settlement, Barrier)
                and Miss_Down (Settlement, Barrier));

   procedure Prove_Touch_Monotonicity
     (Touched : Boolean;
      Hit     : Boolean)
   with
     Global => null,
     Pre => Touched,
     Post => Next_Touched (Touched, Hit);

   procedure Prove_Touch_Activation
     (Touched : Boolean;
      Hit     : Boolean)
   with
     Global => null,
     Pre => not Touched and Hit,
     Post => Next_Touched (Touched, Hit);

   procedure Prove_Touch_False_Only_If_Missed
     (Touched : Boolean;
      Hit     : Boolean)
   with
     Global => null,
     Pre => not Next_Touched (Touched, Hit),
     Post => (not Touched) and (not Hit);

   procedure Prove_Knock_Out_Absorption
     (Live : Boolean;
      Miss : Boolean)
   with
     Global => null,
     Pre => not Live,
     Post => not Next_Live (Live, Miss);

   procedure Prove_Live_Continuation_Requires_Live_And_Miss
     (Live : Boolean;
      Miss : Boolean)
   with
     Global => null,
     Pre => Next_Live (Live, Miss),
     Post => Live and Miss;

   procedure Prove_Pure_Observation_Preserves_Collateral
     (Collateral_Sats : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral_Sats),
     Post => Next_Collateral (Collateral_Sats) = Collateral_Sats;

   procedure Prove_Rebate_Termination_Conservation
     (Collateral_Sats : Amount;
      Payout_Cents    : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Payout_Cents)
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil
         (Rebate_Scaled (Payout_Cents), Settlement, Claim_Sats),
     Post =>
       Option_Holder_BTC (Collateral_Sats, Claim_Sats) >= 0
       and Option_Holder_BTC (Collateral_Sats, Claim_Sats) <= Collateral_Sats
       and Residual_BTC (Collateral_Sats, Claim_Sats) >= 0
       and Residual_BTC (Collateral_Sats, Claim_Sats) <= Collateral_Sats
       and Option_Holder_BTC (Collateral_Sats, Claim_Sats)
         + Residual_BTC (Collateral_Sats, Claim_Sats)
         = Collateral_Sats;

   procedure Prove_Vanilla_Payoffs_Nonnegative
     (Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount)
   with
     Global => null,
     Pre =>
       Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats),
     Post =>
       Call_Scaled (Settlement, Strike, Reference_Sats) >= 0
       and Put_Scaled (Settlement, Strike, Reference_Sats) >= 0;

   procedure Prove_Knock_In_Equals_Vanilla_After_Activation
     (Touched        : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount)
   with
     Global => null,
     Pre =>
       Touched
       and Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats),
     Post =>
       Knock_In_Call_Scaled (Touched, Settlement, Strike, Reference_Sats)
       = Call_Scaled (Settlement, Strike, Reference_Sats)
       and Knock_In_Put_Scaled (Touched, Settlement, Strike, Reference_Sats)
       = Put_Scaled (Settlement, Strike, Reference_Sats);

   procedure Prove_Knock_In_Zero_Without_Activation
     (Touched        : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount)
   with
     Global => null,
     Pre =>
       not Touched
       and Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats),
     Post =>
       Knock_In_Call_Scaled (Touched, Settlement, Strike, Reference_Sats) = 0
       and Knock_In_Put_Scaled (Touched, Settlement, Strike, Reference_Sats)
         = 0;

   procedure Prove_Knock_Out_Equals_Vanilla_While_Live
     (Live           : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount)
   with
     Global => null,
     Pre =>
       Live
       and Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats),
     Post =>
       Knock_Out_Call_Scaled (Live, Settlement, Strike, Reference_Sats)
       = Call_Scaled (Settlement, Strike, Reference_Sats)
       and Knock_Out_Put_Scaled (Live, Settlement, Strike, Reference_Sats)
       = Put_Scaled (Settlement, Strike, Reference_Sats);

   procedure Prove_Knock_Out_Zero_After_Knock_Out
     (Live           : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount)
   with
     Global => null,
     Pre =>
       not Live
       and Positive (Settlement)
       and Nonnegative (Strike)
       and Nonnegative (Reference_Sats),
     Post =>
       Knock_Out_Call_Scaled (Live, Settlement, Strike, Reference_Sats) = 0
       and Knock_Out_Put_Scaled (Live, Settlement, Strike, Reference_Sats)
         = 0;

   procedure Prove_One_Touch_Zero_If_Never_Touched
     (Touched      : Boolean;
      Payout_Cents : Amount)
   with
     Global => null,
     Pre => (not Touched) and Nonnegative (Payout_Cents),
     Post => One_Touch_Scaled (Touched, Payout_Cents) = 0;

   procedure Prove_No_Touch_Zero_If_Touched
     (Live         : Boolean;
      Payout_Cents : Amount)
   with
     Global => null,
     Pre => (not Live) and Nonnegative (Payout_Cents),
     Post => No_Touch_Scaled (Live, Payout_Cents) = 0;

   procedure Prove_Claim_Ceil_Covers
     (Payoff_Scaled : Amount;
      Settlement    : Price;
      Claim_Sats    : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Payoff_Scaled)
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil (Payoff_Scaled, Settlement, Claim_Sats),
     Post => Claim_Sats * Settlement >= Payoff_Scaled;

   procedure Prove_Claim_Rounding_Error_Positive
     (Payoff_Scaled : Amount;
      Settlement    : Price;
      Claim_Sats    : Amount)
   with
     Global => null,
     Pre =>
       Positive (Payoff_Scaled)
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil (Payoff_Scaled, Settlement, Claim_Sats),
     Post =>
       Claim_Sats * Settlement - Payoff_Scaled >= 0
       and Claim_Sats * Settlement - Payoff_Scaled < Settlement;

   procedure Prove_Claim_Rounding_Error_Zero
     (Payoff_Scaled : Amount;
      Settlement    : Price;
      Claim_Sats    : Amount)
   with
     Global => null,
     Pre =>
       Payoff_Scaled = 0
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil (Payoff_Scaled, Settlement, Claim_Sats),
     Post =>
       Claim_Sats = 0
       and Claim_Sats * Settlement - Payoff_Scaled = 0;

   procedure Prove_BTC_Settlement_Conservation
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Claim_Sats),
     Post =>
       Option_Holder_BTC (Collateral_Sats, Claim_Sats) >= 0
       and Option_Holder_BTC (Collateral_Sats, Claim_Sats) <= Collateral_Sats
       and Residual_BTC (Collateral_Sats, Claim_Sats) >= 0
       and Residual_BTC (Collateral_Sats, Claim_Sats) <= Collateral_Sats
       and Option_Holder_BTC (Collateral_Sats, Claim_Sats)
         + Residual_BTC (Collateral_Sats, Claim_Sats)
         = Collateral_Sats;

   procedure Prove_Sufficient_Collateral_Covers_Payoff
     (Collateral_Sats : Amount;
      Payoff_Scaled   : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Payoff_Scaled)
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Claim_Sats <= Collateral_Sats
       and then Valid_Claim_Ceil (Payoff_Scaled, Settlement, Claim_Sats),
     Post =>
       Option_Holder_BTC (Collateral_Sats, Claim_Sats) = Claim_Sats
       and Option_Holder_BTC (Collateral_Sats, Claim_Sats) * Settlement
         >= Payoff_Scaled;

   procedure Prove_One_Step_Touch_Characterization
     (Initial_Touched : Boolean;
      Hit_0           : Boolean)
   with
     Global => null,
     Post =>
       Next_Touched (Initial_Touched, Hit_0)
       = (Initial_Touched or Hit_0);

   procedure Prove_Two_Step_Touch_Characterization
     (Initial_Touched : Boolean;
      Hit_0           : Boolean;
      Hit_1           : Boolean)
   with
     Global => null,
     Post =>
       Two_Step_Touched (Initial_Touched, Hit_0, Hit_1)
       = (Initial_Touched or Hit_0 or Hit_1);
end Barrier_Options_Algebra;
