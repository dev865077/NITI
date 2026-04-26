pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package CPPI_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Price is Valid_Big_Integer;
   subtype Ratio_Component is Valid_Big_Integer;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);

   function Min (A, B : Amount) return Amount is
     (if A <= B then A else B)
   with
     Pre => Nonnegative (A) and Nonnegative (B);

   --  #22: C_i = max(A_i - F_i, 0).
   function Cushion
     (Account_Cents : Amount;
      Floor_Cents   : Amount) return Amount
   is
     (if Account_Cents >= Floor_Cents then Account_Cents - Floor_Cents
      else 0)
   with
     Pre => Nonnegative (Account_Cents) and Nonnegative (Floor_Cents);

   --  #22: E_scaled_i = min(A_i * M_den, M_num * C_i).
   function Exposure_Scaled
     (Account_Cents : Amount;
      Floor_Cents   : Amount;
      M_Num         : Ratio_Component;
      M_Den         : Ratio_Component) return Amount
   is
     (Min (Account_Cents * M_Den,
           M_Num * Cushion (Account_Cents, Floor_Cents)))
   with
     Pre =>
       Nonnegative (Account_Cents)
       and Nonnegative (Floor_Cents)
       and Nonnegative (M_Num)
       and Positive (M_Den);

   --  #22: Safe_scaled_i = A_i * M_den - E_scaled_i.
   function Safe_Scaled
     (Account_Cents  : Amount;
      Exposure_Value : Amount;
      M_Den          : Ratio_Component) return Amount
   is (Account_Cents * M_Den - Exposure_Value)
   with
     Pre =>
       Nonnegative (Account_Cents)
       and Nonnegative (Exposure_Value)
       and Positive (M_Den)
       and Exposure_Value <= Account_Cents * M_Den;

   --  #22: A_next_num = E_scaled_i * S_j + Safe_scaled_i * S_i.
   function Account_Next_Numerator
     (Exposure_Value : Amount;
      Safe_Value     : Amount;
      Price_Now      : Price;
      Price_Next     : Price) return Amount
   is (Exposure_Value * Price_Next + Safe_Value * Price_Now)
   with
     Pre =>
       Nonnegative (Exposure_Value)
       and Nonnegative (Safe_Value)
       and Positive (Price_Now)
       and Positive (Price_Next);

   function Floor_Threshold
     (Floor_Cents : Amount;
      Price_Now   : Price;
      M_Den       : Ratio_Component) return Amount
   is (Floor_Cents * Price_Now * M_Den)
   with
     Pre =>
       Nonnegative (Floor_Cents)
       and Positive (Price_Now)
       and Positive (M_Den);

   --  #22: FloorSafe_j iff A_next_num >= F_i * S_i * M_den.
   function Floor_Safe
     (Next_Num    : Amount;
      Floor_Cents : Amount;
      Price_Now   : Price;
      M_Den       : Ratio_Component) return Boolean
   is (Next_Num >= Floor_Threshold (Floor_Cents, Price_Now, M_Den))
   with
     Pre =>
       Nonnegative (Next_Num)
       and Nonnegative (Floor_Cents)
       and Positive (Price_Now)
       and Positive (M_Den);

   function Floor_Breached
     (Next_Num    : Amount;
      Floor_Cents : Amount;
      Price_Now   : Price;
      M_Den       : Ratio_Component) return Boolean
   is (Next_Num < Floor_Threshold (Floor_Cents, Price_Now, M_Den))
   with
     Pre =>
       Nonnegative (Next_Num)
       and Nonnegative (Floor_Cents)
       and Positive (Price_Now)
       and Positive (M_Den);

   --  #22 defensive child state: E_scaled_j = 0.
   function Defensive_Exposure_Scaled return Amount is (0);

   --  #22 safe continuation cushion numerator.
   function Next_Cushion_Numerator
     (Next_Num    : Amount;
      Floor_Cents : Amount;
      Price_Now   : Price;
      M_Den       : Ratio_Component) return Amount
   is (Next_Num - Floor_Threshold (Floor_Cents, Price_Now, M_Den))
   with
     Pre =>
       Nonnegative (Next_Num)
       and then Nonnegative (Floor_Cents)
       and then Positive (Price_Now)
       and then Positive (M_Den)
       and then Floor_Safe (Next_Num, Floor_Cents, Price_Now, M_Den);

   function Safe_Funding_BTC
     (Collateral_Sats : Amount;
      Risky_Funding   : Amount) return Amount
   is (Collateral_Sats - Risky_Funding)
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Risky_Funding)
       and Risky_Funding <= Collateral_Sats;

   function Next_Collateral
     (Risky_Funding : Amount;
      Safe_Funding  : Amount) return Amount
   is (Risky_Funding + Safe_Funding)
   with
     Pre => Nonnegative (Risky_Funding) and Nonnegative (Safe_Funding);

   procedure Prove_Cushion_Bounds
     (Account_Cents : Amount;
      Floor_Cents   : Amount)
   with
     Global => null,
     Pre => Nonnegative (Account_Cents) and Nonnegative (Floor_Cents),
     Post =>
       Cushion (Account_Cents, Floor_Cents) >= 0
       and Cushion (Account_Cents, Floor_Cents) <= Account_Cents;

   procedure Prove_Exposure_And_Safe_Bounds
     (Account_Cents : Amount;
      Floor_Cents   : Amount;
      M_Num         : Ratio_Component;
      M_Den         : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Account_Cents)
       and Nonnegative (Floor_Cents)
       and Nonnegative (M_Num)
       and Positive (M_Den),
     Post =>
       Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den) >= 0
       and Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den)
         <= Account_Cents * M_Den
       and Safe_Scaled
         (Account_Cents,
          Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den),
          M_Den) >= 0
       and Safe_Scaled
         (Account_Cents,
          Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den),
          M_Den) <= Account_Cents * M_Den
       and Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den)
         + Safe_Scaled
           (Account_Cents,
            Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den),
            M_Den)
         = Account_Cents * M_Den;

   procedure Prove_Floor_Branch_Zero_Exposure
     (Account_Cents : Amount;
      Floor_Cents   : Amount;
      M_Num         : Ratio_Component;
      M_Den         : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Account_Cents)
       and Nonnegative (Floor_Cents)
       and Nonnegative (M_Num)
       and Positive (M_Den)
       and Account_Cents <= Floor_Cents,
     Post =>
       Cushion (Account_Cents, Floor_Cents) = 0
       and Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den) = 0
       and Safe_Scaled
         (Account_Cents,
          Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den),
          M_Den) = Account_Cents * M_Den;

   procedure Prove_Account_Update_Cross_Multiplied
     (Exposure_Value : Amount;
      Safe_Value     : Amount;
      Price_Now      : Price;
      Price_Next     : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Exposure_Value)
       and Nonnegative (Safe_Value)
       and Positive (Price_Now)
       and Positive (Price_Next),
     Post =>
       Account_Next_Numerator
         (Exposure_Value, Safe_Value, Price_Now, Price_Next)
       =
       Exposure_Value * Price_Next + Safe_Value * Price_Now;

   procedure Prove_Up_Move_Preserves_Floor
     (Account_Cents : Amount;
      Floor_Cents   : Amount;
      M_Num         : Ratio_Component;
      M_Den         : Ratio_Component;
      Price_Now     : Price;
      Price_Next    : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Account_Cents)
       and Nonnegative (Floor_Cents)
       and Nonnegative (M_Num)
       and Positive (M_Den)
       and Positive (Price_Now)
       and Positive (Price_Next)
       and Account_Cents >= Floor_Cents
       and Price_Next >= Price_Now,
     Post =>
       Floor_Safe
         (Account_Next_Numerator
            (Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den),
             Safe_Scaled
               (Account_Cents,
                Exposure_Scaled
                  (Account_Cents, Floor_Cents, M_Num, M_Den),
                M_Den),
             Price_Now,
             Price_Next),
          Floor_Cents,
          Price_Now,
          M_Den);

   procedure Prove_Bounded_Down_Move_Preserves_Floor
     (Account_Cents : Amount;
      Floor_Cents   : Amount;
      M_Num         : Ratio_Component;
      M_Den         : Ratio_Component;
      Price_Now     : Price;
      Price_Next    : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Account_Cents)
       and then Nonnegative (Floor_Cents)
       and then Nonnegative (M_Num)
       and then Positive (M_Den)
       and then Positive (Price_Now)
       and then Positive (Price_Next)
       and then Account_Cents >= Floor_Cents
       and then Price_Next <= Price_Now
       and then Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den)
         * (Price_Now - Price_Next)
         <= (Account_Cents - Floor_Cents) * M_Den * Price_Now,
     Post =>
       Floor_Safe
         (Account_Next_Numerator
            (Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den),
             Safe_Scaled
               (Account_Cents,
                Exposure_Scaled
                  (Account_Cents, Floor_Cents, M_Num, M_Den),
                M_Den),
             Price_Now,
             Price_Next),
          Floor_Cents,
          Price_Now,
          M_Den);

   procedure Prove_Floor_Branch_Coverage_Disjointness
     (Next_Num    : Amount;
      Floor_Cents : Amount;
      Price_Now   : Price;
      M_Den       : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Next_Num)
       and Nonnegative (Floor_Cents)
       and Positive (Price_Now)
       and Positive (M_Den),
     Post =>
       (Floor_Safe (Next_Num, Floor_Cents, Price_Now, M_Den)
        or Floor_Breached (Next_Num, Floor_Cents, Price_Now, M_Den))
       and not
         (Floor_Safe (Next_Num, Floor_Cents, Price_Now, M_Den)
          and Floor_Breached (Next_Num, Floor_Cents, Price_Now, M_Den));

   procedure Prove_Defensive_Branch_Zero_Risky_Exposure
     (Next_Num    : Amount;
      Floor_Cents : Amount;
      Price_Now   : Price;
      M_Den       : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Next_Num)
       and then Nonnegative (Floor_Cents)
       and then Positive (Price_Now)
       and then Positive (M_Den)
       and then Floor_Breached (Next_Num, Floor_Cents, Price_Now, M_Den),
     Post => Defensive_Exposure_Scaled = 0;

   procedure Prove_Floor_Safe_Next_Cushion_Nonnegative
     (Next_Num    : Amount;
      Floor_Cents : Amount;
      Price_Now   : Price;
      M_Den       : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Next_Num)
       and then Nonnegative (Floor_Cents)
       and then Positive (Price_Now)
       and then Positive (M_Den)
       and then Floor_Safe (Next_Num, Floor_Cents, Price_Now, M_Den),
     Post =>
       Next_Cushion_Numerator (Next_Num, Floor_Cents, Price_Now, M_Den)
       >= 0;

   procedure Prove_BTC_Funding_Split_Conservation
     (Collateral_Sats : Amount;
      Risky_Funding   : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Risky_Funding)
       and Risky_Funding <= Collateral_Sats,
     Post =>
       Safe_Funding_BTC (Collateral_Sats, Risky_Funding) >= 0
       and Safe_Funding_BTC (Collateral_Sats, Risky_Funding)
         <= Collateral_Sats
       and Risky_Funding + Safe_Funding_BTC
         (Collateral_Sats, Risky_Funding) = Collateral_Sats;

   procedure Prove_Two_Step_Collateral_Conservation
     (Collateral_0 : Amount;
      Collateral_1 : Amount;
      Collateral_2 : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_0)
       and Nonnegative (Collateral_1)
       and Nonnegative (Collateral_2)
       and Collateral_1 = Collateral_0
       and Collateral_2 = Collateral_1,
     Post => Collateral_2 = Collateral_0;

   procedure Prove_Gap_Risk_Counterexample
   with
     Global => null,
     Post =>
       Floor_Breached
         (Account_Next_Numerator (100, 0, 100, 1), 90, 100, 1);
end CPPI_Algebra;
