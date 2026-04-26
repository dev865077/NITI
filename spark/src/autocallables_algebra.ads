pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Autocallables_Algebra with
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

   --  #18: Autocall_i holds when S_i >= A_i.
   function Autocall
     (Settlement       : Price;
      Autocall_Trigger : Price) return Boolean
   is (Settlement >= Autocall_Trigger)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Autocall_Trigger);

   --  #18: CouponContinue_i holds when S_i < A_i and S_i >= C_i.
   function Coupon_Continue
     (Settlement       : Price;
      Autocall_Trigger : Price;
      Coupon_Barrier   : Price) return Boolean
   is
     (Settlement < Autocall_Trigger and Settlement >= Coupon_Barrier)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Autocall_Trigger)
       and Nonnegative (Coupon_Barrier)
       and Autocall_Trigger >= Coupon_Barrier;

   --  #18: NoCouponContinue_i holds when S_i < C_i.
   function No_Coupon_Continue
     (Settlement     : Price;
      Coupon_Barrier : Price) return Boolean
   is (Settlement < Coupon_Barrier)
   with
     Pre => Positive (Settlement) and Nonnegative (Coupon_Barrier);

   --  #18 memory continuation:
   --    coupon branch: Accrued_{i+1} = Accrued_i + c_i
   --    missed branch: Accrued_{i+1} = Accrued_i
   function Memory_Accrued_Next
     (Accrued_Cents : Amount;
      Coupon_Cents  : Amount;
      Coupon_Branch : Boolean) return Amount
   is
     (if Coupon_Branch then Accrued_Cents + Coupon_Cents
      else Accrued_Cents)
   with
     Pre => Nonnegative (Accrued_Cents) and Nonnegative (Coupon_Cents);

   --  #18 non-memory continuation:
   --    coupon branch: Accrued_{i+1} = Accrued_i + c_i
   --    missed branch: Accrued_{i+1} = 0
   function Nonmemory_Accrued_Next
     (Accrued_Cents : Amount;
      Coupon_Cents  : Amount;
      Coupon_Branch : Boolean) return Amount
   is
     (if Coupon_Branch then Accrued_Cents + Coupon_Cents
      else 0)
   with
     Pre => Nonnegative (Accrued_Cents) and Nonnegative (Coupon_Cents);

   --  #18: RedeemUSD_i = N + Accrued_i + c_i.
   function Redeem_USD
     (Principal_Cents : Amount;
      Accrued_Cents   : Amount;
      Coupon_Cents    : Amount) return Amount
   is (Principal_Cents + Accrued_Cents + Coupon_Cents)
   with
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Accrued_Cents)
       and Nonnegative (Coupon_Cents);

   function Redeem_Scaled
     (Principal_Cents : Amount;
      Accrued_Cents   : Amount;
      Coupon_Cents    : Amount) return Amount
   is (Redeem_USD (Principal_Cents, Accrued_Cents, Coupon_Cents) * SAT)
   with
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Accrued_Cents)
       and Nonnegative (Coupon_Cents);

   --  #18: State_{i+1} = Terminal in the autocall branch.
   function Terminal_After_Autocall (Autocall_Branch : Boolean)
                                     return Boolean
   is (Autocall_Branch);

   function Continuation_Funded (Autocall_Branch : Boolean) return Boolean is
     (not Autocall_Branch);

   --  #18: Continuation branches preserve Q_i.
   function Continuation_Collateral
     (Collateral_Sats : Amount) return Amount
   is (Collateral_Sats)
   with
     Pre => Nonnegative (Collateral_Sats);

   --  #18: ClaimBTC = ceil(RedeemScaled / S_i).
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

   function Investor_BTC
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount) return Amount
   is (Min (Collateral_Sats, Claim_Sats))
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Claim_Sats);

   function Issuer_Residual_BTC
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount) return Amount
   is (Collateral_Sats - Investor_BTC (Collateral_Sats, Claim_Sats))
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Claim_Sats);

   --  #18: ReversePrincipalScaled = Min(N * SAT, R * S_T).
   function Reverse_Principal_Scaled
     (Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Settlement      : Price) return Amount
   is (Min (Principal_Cents * SAT, Reference_Sats * Settlement))
   with
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Reference_Sats)
       and Positive (Settlement);

   function Maturity_Scaled
     (Principal_Cents : Amount;
      Accrued_Cents   : Amount) return Amount
   is ((Principal_Cents + Accrued_Cents) * SAT)
   with
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Accrued_Cents);

   function Two_Step_Memory_Accrued
     (Initial_Accrued : Amount;
      Coupon_0        : Amount;
      Coupon_1        : Amount;
      Coupon_Branch_0 : Boolean;
      Coupon_Branch_1 : Boolean) return Amount
   is
     (Memory_Accrued_Next
        (Memory_Accrued_Next
           (Initial_Accrued, Coupon_0, Coupon_Branch_0),
         Coupon_1,
         Coupon_Branch_1))
   with
     Pre =>
       Nonnegative (Initial_Accrued)
       and Nonnegative (Coupon_0)
       and Nonnegative (Coupon_1);

   function Two_Step_Nonmemory_Accrued
     (Initial_Accrued : Amount;
      Coupon_0        : Amount;
      Coupon_1        : Amount;
      Coupon_Branch_0 : Boolean;
      Coupon_Branch_1 : Boolean) return Amount
   is
     (Nonmemory_Accrued_Next
        (Nonmemory_Accrued_Next
           (Initial_Accrued, Coupon_0, Coupon_Branch_0),
         Coupon_1,
         Coupon_Branch_1))
   with
     Pre =>
       Nonnegative (Initial_Accrued)
       and Nonnegative (Coupon_0)
       and Nonnegative (Coupon_1);

   procedure Prove_Observation_Branch_Coverage_Disjointness
     (Settlement       : Price;
      Autocall_Trigger : Price;
      Coupon_Barrier   : Price)
   with
     Global => null,
     Pre =>
       Positive (Settlement)
       and Nonnegative (Autocall_Trigger)
       and Nonnegative (Coupon_Barrier)
       and Autocall_Trigger >= Coupon_Barrier,
     Post =>
       (Autocall (Settlement, Autocall_Trigger)
        or Coupon_Continue
          (Settlement, Autocall_Trigger, Coupon_Barrier)
        or No_Coupon_Continue (Settlement, Coupon_Barrier))
       and not
         (Autocall (Settlement, Autocall_Trigger)
          and Coupon_Continue
            (Settlement, Autocall_Trigger, Coupon_Barrier))
       and not
         (Autocall (Settlement, Autocall_Trigger)
          and No_Coupon_Continue (Settlement, Coupon_Barrier))
       and not
         (Coupon_Continue
            (Settlement, Autocall_Trigger, Coupon_Barrier)
          and No_Coupon_Continue (Settlement, Coupon_Barrier));

   procedure Prove_Memory_Accrual_Monotonic
     (Accrued_Cents : Amount;
      Coupon_Cents  : Amount;
      Coupon_Branch : Boolean)
   with
     Global => null,
     Pre => Nonnegative (Accrued_Cents) and Nonnegative (Coupon_Cents),
     Post =>
       Memory_Accrued_Next
         (Accrued_Cents, Coupon_Cents, Coupon_Branch)
       >= Accrued_Cents;

   procedure Prove_Nonmemory_Coupon_Update
     (Accrued_Cents : Amount;
      Coupon_Cents  : Amount)
   with
     Global => null,
     Pre => Nonnegative (Accrued_Cents) and Nonnegative (Coupon_Cents),
     Post =>
       Nonmemory_Accrued_Next (Accrued_Cents, Coupon_Cents, True)
       = Accrued_Cents + Coupon_Cents
       and
       Nonmemory_Accrued_Next (Accrued_Cents, Coupon_Cents, True)
       >= Accrued_Cents
       and
       Nonmemory_Accrued_Next (Accrued_Cents, Coupon_Cents, False) = 0;

   procedure Prove_Autocall_Redemption_Amount
     (Principal_Cents : Amount;
      Accrued_Cents   : Amount;
      Coupon_Cents    : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Accrued_Cents)
       and Nonnegative (Coupon_Cents),
     Post =>
       Redeem_USD (Principal_Cents, Accrued_Cents, Coupon_Cents)
       = Principal_Cents + Accrued_Cents + Coupon_Cents
       and
       Redeem_Scaled (Principal_Cents, Accrued_Cents, Coupon_Cents)
       =
       (Principal_Cents + Accrued_Cents + Coupon_Cents) * SAT;

   procedure Prove_Autocall_Terminal_No_Continuation
     (Autocall_Branch : Boolean)
   with
     Global => null,
     Pre => Autocall_Branch,
     Post =>
       Terminal_After_Autocall (Autocall_Branch)
       and not Continuation_Funded (Autocall_Branch);

   procedure Prove_Continuation_Preserves_Collateral
     (Collateral_Sats : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral_Sats),
     Post => Continuation_Collateral (Collateral_Sats) = Collateral_Sats;

   procedure Prove_Terminal_BTC_Conservation
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Claim_Sats),
     Post =>
       Investor_BTC (Collateral_Sats, Claim_Sats) >= 0
       and Investor_BTC (Collateral_Sats, Claim_Sats) <= Collateral_Sats
       and Issuer_Residual_BTC (Collateral_Sats, Claim_Sats) >= 0
       and Issuer_Residual_BTC (Collateral_Sats, Claim_Sats)
         <= Collateral_Sats
       and Investor_BTC (Collateral_Sats, Claim_Sats)
         + Issuer_Residual_BTC (Collateral_Sats, Claim_Sats)
         = Collateral_Sats;

   procedure Prove_Sufficient_Collateral_Covers_Redemption
     (Collateral_Sats : Amount;
      Redeem_Scaled_V : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Redeem_Scaled_V)
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Claim_Sats <= Collateral_Sats
       and then Valid_Claim_Ceil
         (Redeem_Scaled_V, Settlement, Claim_Sats),
     Post =>
       Investor_BTC (Collateral_Sats, Claim_Sats) = Claim_Sats
       and Investor_BTC (Collateral_Sats, Claim_Sats) * Settlement
         >= Redeem_Scaled_V;

   procedure Prove_Redemption_Rounding_Positive
     (Redeem_Scaled_V : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre =>
       Positive (Redeem_Scaled_V)
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil
         (Redeem_Scaled_V, Settlement, Claim_Sats),
     Post =>
       Claim_Sats * Settlement - Redeem_Scaled_V >= 0
       and Claim_Sats * Settlement - Redeem_Scaled_V < Settlement;

   procedure Prove_Redemption_Rounding_Zero
     (Redeem_Scaled_V : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre =>
       Redeem_Scaled_V = 0
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil
         (Redeem_Scaled_V, Settlement, Claim_Sats),
     Post =>
       Claim_Sats = 0
       and Claim_Sats * Settlement - Redeem_Scaled_V = 0;

   procedure Prove_One_Step_Coupon_Liability_Bounds
     (Accrued_Cents : Amount;
      Coupon_Cents  : Amount;
      Coupon_Branch : Boolean)
   with
     Global => null,
     Pre => Nonnegative (Accrued_Cents) and Nonnegative (Coupon_Cents),
     Post =>
       Memory_Accrued_Next
         (Accrued_Cents, Coupon_Cents, Coupon_Branch)
       <= Accrued_Cents + Coupon_Cents
       and
       Nonmemory_Accrued_Next
         (Accrued_Cents, Coupon_Cents, Coupon_Branch)
       <= Accrued_Cents + Coupon_Cents;

   procedure Prove_Two_Step_Coupon_Liability_Bounds
     (Initial_Accrued : Amount;
      Coupon_0        : Amount;
      Coupon_1        : Amount;
      Coupon_Branch_0 : Boolean;
      Coupon_Branch_1 : Boolean)
   with
     Global => null,
     Pre =>
       Nonnegative (Initial_Accrued)
       and Nonnegative (Coupon_0)
       and Nonnegative (Coupon_1),
     Post =>
       Two_Step_Memory_Accrued
         (Initial_Accrued,
          Coupon_0,
          Coupon_1,
          Coupon_Branch_0,
          Coupon_Branch_1)
       <= Initial_Accrued + Coupon_0 + Coupon_1
       and
       Two_Step_Nonmemory_Accrued
         (Initial_Accrued,
          Coupon_0,
          Coupon_1,
          Coupon_Branch_0,
          Coupon_Branch_1)
       <= Initial_Accrued + Coupon_0 + Coupon_1;

   procedure Prove_Maximum_Autocall_Liability_Bound
     (Principal_Cents : Amount;
      Accrued_Cents   : Amount;
      Initial_Accrued : Amount;
      Prior_Coupon_Sum : Amount;
      Current_Coupon  : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Accrued_Cents)
       and Nonnegative (Initial_Accrued)
       and Nonnegative (Prior_Coupon_Sum)
       and Nonnegative (Current_Coupon)
       and Accrued_Cents <= Initial_Accrued + Prior_Coupon_Sum,
     Post =>
       Redeem_USD (Principal_Cents, Accrued_Cents, Current_Coupon)
       <= Principal_Cents + Initial_Accrued
          + Prior_Coupon_Sum + Current_Coupon;

   procedure Prove_Reverse_Principal_Bounds
     (Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Settlement      : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Reference_Sats)
       and Positive (Settlement),
     Post =>
       Reverse_Principal_Scaled
         (Principal_Cents, Reference_Sats, Settlement) >= 0
       and
       Reverse_Principal_Scaled
         (Principal_Cents, Reference_Sats, Settlement)
       <= Principal_Cents * SAT;

   procedure Prove_Principal_Protected_Maturity_Covered
     (Collateral_Sats : Amount;
      Principal_Cents : Amount;
      Accrued_Cents   : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Principal_Cents)
       and then Nonnegative (Accrued_Cents)
       and then Positive (Settlement)
       and then Nonnegative (Claim_Sats)
       and then Claim_Sats <= Collateral_Sats
       and then Valid_Claim_Ceil
         (Maturity_Scaled (Principal_Cents, Accrued_Cents),
          Settlement,
          Claim_Sats),
     Post =>
       Investor_BTC (Collateral_Sats, Claim_Sats) * Settlement
       >= Maturity_Scaled (Principal_Cents, Accrued_Cents);
end Autocallables_Algebra;
