pragma SPARK_Mode (On);

package body Autocallables_Algebra is
   procedure Prove_Observation_Branch_Coverage_Disjointness
     (Settlement       : Price;
      Autocall_Trigger : Price;
      Coupon_Barrier   : Price) is
   begin
      if Settlement >= Autocall_Trigger then
         pragma Assert (Autocall (Settlement, Autocall_Trigger));
         pragma Assert
           (not Coupon_Continue
              (Settlement, Autocall_Trigger, Coupon_Barrier));
         pragma Assert
           (not No_Coupon_Continue (Settlement, Coupon_Barrier));
      elsif Settlement >= Coupon_Barrier then
         pragma Assert
           (Coupon_Continue
              (Settlement, Autocall_Trigger, Coupon_Barrier));
         pragma Assert (not Autocall (Settlement, Autocall_Trigger));
         pragma Assert
           (not No_Coupon_Continue (Settlement, Coupon_Barrier));
      else
         pragma Assert
           (No_Coupon_Continue (Settlement, Coupon_Barrier));
         pragma Assert (Settlement < Autocall_Trigger);
         pragma Assert (not Autocall (Settlement, Autocall_Trigger));
         pragma Assert
           (not Coupon_Continue
              (Settlement, Autocall_Trigger, Coupon_Barrier));
      end if;
   end Prove_Observation_Branch_Coverage_Disjointness;

   procedure Prove_Memory_Accrual_Monotonic
     (Accrued_Cents : Amount;
      Coupon_Cents  : Amount;
      Coupon_Branch : Boolean) is
   begin
      if Coupon_Branch then
         pragma Assert
           (Memory_Accrued_Next
              (Accrued_Cents, Coupon_Cents, Coupon_Branch)
            = Accrued_Cents + Coupon_Cents);
      else
         pragma Assert
           (Memory_Accrued_Next
              (Accrued_Cents, Coupon_Cents, Coupon_Branch)
            = Accrued_Cents);
      end if;
      pragma Assert
        (Memory_Accrued_Next
           (Accrued_Cents, Coupon_Cents, Coupon_Branch)
         >= Accrued_Cents);
   end Prove_Memory_Accrual_Monotonic;

   procedure Prove_Nonmemory_Coupon_Update
     (Accrued_Cents : Amount;
      Coupon_Cents  : Amount) is
   begin
      pragma Assert
        (Nonmemory_Accrued_Next (Accrued_Cents, Coupon_Cents, True)
         = Accrued_Cents + Coupon_Cents);
      pragma Assert
        (Nonmemory_Accrued_Next (Accrued_Cents, Coupon_Cents, True)
         >= Accrued_Cents);
      pragma Assert
        (Nonmemory_Accrued_Next (Accrued_Cents, Coupon_Cents, False)
         = 0);
   end Prove_Nonmemory_Coupon_Update;

   procedure Prove_Autocall_Redemption_Amount
     (Principal_Cents : Amount;
      Accrued_Cents   : Amount;
      Coupon_Cents    : Amount) is
   begin
      pragma Assert
        (Redeem_USD (Principal_Cents, Accrued_Cents, Coupon_Cents)
         = Principal_Cents + Accrued_Cents + Coupon_Cents);
      pragma Assert
        (Redeem_Scaled (Principal_Cents, Accrued_Cents, Coupon_Cents)
         =
         (Principal_Cents + Accrued_Cents + Coupon_Cents) * SAT);
   end Prove_Autocall_Redemption_Amount;

   procedure Prove_Autocall_Terminal_No_Continuation
     (Autocall_Branch : Boolean) is
   begin
      pragma Assert (Autocall_Branch);
      pragma Assert (Terminal_After_Autocall (Autocall_Branch));
      pragma Assert (not Continuation_Funded (Autocall_Branch));
   end Prove_Autocall_Terminal_No_Continuation;

   procedure Prove_Continuation_Preserves_Collateral
     (Collateral_Sats : Amount) is
   begin
      pragma Assert (Continuation_Collateral (Collateral_Sats)
                     = Collateral_Sats);
   end Prove_Continuation_Preserves_Collateral;

   procedure Prove_Terminal_BTC_Conservation
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount) is
      Investor : constant Amount := Investor_BTC (Collateral_Sats, Claim_Sats);
      Residual : constant Amount :=
        Issuer_Residual_BTC (Collateral_Sats, Claim_Sats);
   begin
      if Claim_Sats <= Collateral_Sats then
         pragma Assert (Investor = Claim_Sats);
         pragma Assert (Residual = Collateral_Sats - Claim_Sats);
      else
         pragma Assert (Investor = Collateral_Sats);
         pragma Assert (Residual = 0);
      end if;

      pragma Assert (Investor >= 0);
      pragma Assert (Investor <= Collateral_Sats);
      pragma Assert (Residual >= 0);
      pragma Assert (Residual <= Collateral_Sats);
      pragma Assert (Investor + Residual = Collateral_Sats);
   end Prove_Terminal_BTC_Conservation;

   procedure Prove_Sufficient_Collateral_Covers_Redemption
     (Collateral_Sats : Amount;
      Redeem_Scaled_V : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount) is
      Investor : constant Amount := Investor_BTC (Collateral_Sats, Claim_Sats);
   begin
      pragma Assert (Investor = Claim_Sats);
      pragma Assert (Claim_Sats * Settlement >= Redeem_Scaled_V);
      pragma Assert (Investor * Settlement >= Redeem_Scaled_V);
   end Prove_Sufficient_Collateral_Covers_Redemption;

   procedure Prove_Redemption_Rounding_Positive
     (Redeem_Scaled_V : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount) is
   begin
      pragma Assert (Claim_Sats * Settlement >= Redeem_Scaled_V);
      if Claim_Sats = 0 then
         pragma Assert (Claim_Sats * Settlement = 0);
         pragma Assert (Redeem_Scaled_V > 0);
      else
         pragma Assert ((Claim_Sats - 1) * Settlement < Redeem_Scaled_V);
         pragma Assert (Claim_Sats * Settlement =
                        (Claim_Sats - 1) * Settlement + Settlement);
         pragma Assert (Claim_Sats * Settlement
                        < Redeem_Scaled_V + Settlement);
         pragma Assert
           (Claim_Sats * Settlement - Redeem_Scaled_V < Settlement);
      end if;
      pragma Assert (Claim_Sats * Settlement - Redeem_Scaled_V >= 0);
   end Prove_Redemption_Rounding_Positive;

   procedure Prove_Redemption_Rounding_Zero
     (Redeem_Scaled_V : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount) is
   begin
      pragma Assert (Redeem_Scaled_V = 0);
      if Claim_Sats = 0 then
         pragma Assert (Claim_Sats * Settlement = 0);
      else
         pragma Assert ((Claim_Sats - 1) * Settlement < Redeem_Scaled_V);
         pragma Assert (Claim_Sats - 1 >= 0);
         pragma Assert ((Claim_Sats - 1) * Settlement >= 0);
      end if;
      pragma Assert (Claim_Sats = 0);
      pragma Assert (Claim_Sats * Settlement - Redeem_Scaled_V = 0);
   end Prove_Redemption_Rounding_Zero;

   procedure Prove_One_Step_Coupon_Liability_Bounds
     (Accrued_Cents : Amount;
      Coupon_Cents  : Amount;
      Coupon_Branch : Boolean) is
   begin
      if Coupon_Branch then
         pragma Assert
           (Memory_Accrued_Next
              (Accrued_Cents, Coupon_Cents, Coupon_Branch)
            = Accrued_Cents + Coupon_Cents);
         pragma Assert
           (Nonmemory_Accrued_Next
              (Accrued_Cents, Coupon_Cents, Coupon_Branch)
            = Accrued_Cents + Coupon_Cents);
      else
         pragma Assert
           (Memory_Accrued_Next
              (Accrued_Cents, Coupon_Cents, Coupon_Branch)
            = Accrued_Cents);
         pragma Assert
           (Nonmemory_Accrued_Next
              (Accrued_Cents, Coupon_Cents, Coupon_Branch)
            = 0);
      end if;
      pragma Assert
        (Memory_Accrued_Next
           (Accrued_Cents, Coupon_Cents, Coupon_Branch)
         <= Accrued_Cents + Coupon_Cents);
      pragma Assert
        (Nonmemory_Accrued_Next
           (Accrued_Cents, Coupon_Cents, Coupon_Branch)
         <= Accrued_Cents + Coupon_Cents);
   end Prove_One_Step_Coupon_Liability_Bounds;

   procedure Prove_Two_Step_Coupon_Liability_Bounds
     (Initial_Accrued : Amount;
      Coupon_0        : Amount;
      Coupon_1        : Amount;
      Coupon_Branch_0 : Boolean;
      Coupon_Branch_1 : Boolean) is
      Memory_One : constant Amount :=
        Memory_Accrued_Next
          (Initial_Accrued, Coupon_0, Coupon_Branch_0);
      Nonmemory_One : constant Amount :=
        Nonmemory_Accrued_Next
          (Initial_Accrued, Coupon_0, Coupon_Branch_0);
   begin
      Prove_One_Step_Coupon_Liability_Bounds
        (Initial_Accrued, Coupon_0, Coupon_Branch_0);
      pragma Assert (Memory_One <= Initial_Accrued + Coupon_0);
      pragma Assert (Nonmemory_One <= Initial_Accrued + Coupon_0);

      Prove_One_Step_Coupon_Liability_Bounds
        (Memory_One, Coupon_1, Coupon_Branch_1);
      Prove_One_Step_Coupon_Liability_Bounds
        (Nonmemory_One, Coupon_1, Coupon_Branch_1);

      pragma Assert
        (Two_Step_Memory_Accrued
           (Initial_Accrued,
            Coupon_0,
            Coupon_1,
            Coupon_Branch_0,
            Coupon_Branch_1)
         <= Memory_One + Coupon_1);
      pragma Assert
        (Two_Step_Nonmemory_Accrued
           (Initial_Accrued,
            Coupon_0,
            Coupon_1,
            Coupon_Branch_0,
            Coupon_Branch_1)
         <= Nonmemory_One + Coupon_1);
      pragma Assert
        (Memory_One + Coupon_1
         <= Initial_Accrued + Coupon_0 + Coupon_1);
      pragma Assert
        (Nonmemory_One + Coupon_1
         <= Initial_Accrued + Coupon_0 + Coupon_1);
   end Prove_Two_Step_Coupon_Liability_Bounds;

   procedure Prove_Maximum_Autocall_Liability_Bound
     (Principal_Cents : Amount;
      Accrued_Cents   : Amount;
      Initial_Accrued : Amount;
      Prior_Coupon_Sum : Amount;
      Current_Coupon  : Amount) is
   begin
      pragma Assert
        (Redeem_USD (Principal_Cents, Accrued_Cents, Current_Coupon)
         = Principal_Cents + Accrued_Cents + Current_Coupon);
      pragma Assert
        (Principal_Cents + Accrued_Cents + Current_Coupon
         <= Principal_Cents + Initial_Accrued
            + Prior_Coupon_Sum + Current_Coupon);
   end Prove_Maximum_Autocall_Liability_Bound;

   procedure Prove_Reverse_Principal_Bounds
     (Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Settlement      : Price) is
      Principal_Scaled : constant Amount := Principal_Cents * SAT;
      Reference_Scaled : constant Amount := Reference_Sats * Settlement;
      Reverse_Principal : constant Amount :=
        Reverse_Principal_Scaled
          (Principal_Cents, Reference_Sats, Settlement);
   begin
      if Principal_Scaled <= Reference_Scaled then
         pragma Assert (Reverse_Principal = Principal_Scaled);
      else
         pragma Assert (Reverse_Principal = Reference_Scaled);
      end if;
      pragma Assert (Reverse_Principal >= 0);
      pragma Assert (Reverse_Principal <= Principal_Scaled);
   end Prove_Reverse_Principal_Bounds;

   procedure Prove_Principal_Protected_Maturity_Covered
     (Collateral_Sats : Amount;
      Principal_Cents : Amount;
      Accrued_Cents   : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount) is
      Payoff : constant Amount := Maturity_Scaled
        (Principal_Cents, Accrued_Cents);
      Investor : constant Amount := Investor_BTC (Collateral_Sats, Claim_Sats);
   begin
      Prove_Sufficient_Collateral_Covers_Redemption
        (Collateral_Sats, Payoff, Settlement, Claim_Sats);
      pragma Assert (Investor * Settlement >= Payoff);
      pragma Assert
        (Investor * Settlement
         >= Maturity_Scaled (Principal_Cents, Accrued_Cents));
   end Prove_Principal_Protected_Maturity_Covered;
end Autocallables_Algebra;
