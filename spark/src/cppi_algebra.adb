pragma SPARK_Mode (On);

package body CPPI_Algebra is
   procedure Prove_Cushion_Bounds
     (Account_Cents : Amount;
      Floor_Cents   : Amount) is
      C : constant Amount := Cushion (Account_Cents, Floor_Cents);
   begin
      if Account_Cents >= Floor_Cents then
         pragma Assert (C = Account_Cents - Floor_Cents);
      else
         pragma Assert (C = 0);
      end if;
      pragma Assert (C >= 0);
      pragma Assert (C <= Account_Cents);
   end Prove_Cushion_Bounds;

   procedure Prove_Exposure_And_Safe_Bounds
     (Account_Cents : Amount;
      Floor_Cents   : Amount;
      M_Num         : Ratio_Component;
      M_Den         : Ratio_Component) is
      Account_Scaled : constant Amount := Account_Cents * M_Den;
      Levered_Cushion : constant Amount :=
        M_Num * Cushion (Account_Cents, Floor_Cents);
      E : constant Amount :=
        Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den);
      Safe : constant Amount := Safe_Scaled (Account_Cents, E, M_Den);
   begin
      if Account_Scaled <= Levered_Cushion then
         pragma Assert (E = Account_Scaled);
      else
         pragma Assert (E = Levered_Cushion);
      end if;
      pragma Assert (E >= 0);
      pragma Assert (E <= Account_Scaled);
      pragma Assert (Safe = Account_Scaled - E);
      pragma Assert (Safe >= 0);
      pragma Assert (Safe <= Account_Scaled);
      pragma Assert (E + Safe = Account_Scaled);
   end Prove_Exposure_And_Safe_Bounds;

   procedure Prove_Floor_Branch_Zero_Exposure
     (Account_Cents : Amount;
      Floor_Cents   : Amount;
      M_Num         : Ratio_Component;
      M_Den         : Ratio_Component) is
      E : constant Amount :=
        Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den);
      Safe : constant Amount := Safe_Scaled (Account_Cents, E, M_Den);
   begin
      pragma Assert (Cushion (Account_Cents, Floor_Cents) = 0);
      pragma Assert (M_Num * Cushion (Account_Cents, Floor_Cents) = 0);
      pragma Assert (E = 0);
      pragma Assert (Safe = Account_Cents * M_Den);
   end Prove_Floor_Branch_Zero_Exposure;

   procedure Prove_Account_Update_Cross_Multiplied
     (Exposure_Value : Amount;
      Safe_Value     : Amount;
      Price_Now      : Price;
      Price_Next     : Price) is
   begin
      pragma Assert
        (Account_Next_Numerator
           (Exposure_Value, Safe_Value, Price_Now, Price_Next)
         = Exposure_Value * Price_Next + Safe_Value * Price_Now);
   end Prove_Account_Update_Cross_Multiplied;

   procedure Prove_Up_Move_Preserves_Floor
     (Account_Cents : Amount;
      Floor_Cents   : Amount;
      M_Num         : Ratio_Component;
      M_Den         : Ratio_Component;
      Price_Now     : Price;
      Price_Next    : Price) is
      E : constant Amount :=
        Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den);
      Safe : constant Amount := Safe_Scaled (Account_Cents, E, M_Den);
      Next_Num : constant Amount :=
        Account_Next_Numerator (E, Safe, Price_Now, Price_Next);
      Threshold : constant Amount :=
        Floor_Threshold (Floor_Cents, Price_Now, M_Den);
   begin
      Prove_Exposure_And_Safe_Bounds
        (Account_Cents, Floor_Cents, M_Num, M_Den);
      pragma Assert (E + Safe = Account_Cents * M_Den);
      pragma Assert (E * Price_Next >= E * Price_Now);
      pragma Assert
        (Next_Num >= E * Price_Now + Safe * Price_Now);
      pragma Assert
        (E * Price_Now + Safe * Price_Now = (E + Safe) * Price_Now);
      pragma Assert
        ((E + Safe) * Price_Now = Account_Cents * M_Den * Price_Now);
      pragma Assert
        (Account_Cents * M_Den * Price_Now
         >= Floor_Cents * M_Den * Price_Now);
      pragma Assert (Floor_Cents * M_Den * Price_Now = Threshold);
      pragma Assert (Next_Num >= Threshold);
   end Prove_Up_Move_Preserves_Floor;

   procedure Prove_Bounded_Down_Move_Preserves_Floor
     (Account_Cents : Amount;
      Floor_Cents   : Amount;
      M_Num         : Ratio_Component;
      M_Den         : Ratio_Component;
      Price_Now     : Price;
      Price_Next    : Price) is
      E : constant Amount :=
        Exposure_Scaled (Account_Cents, Floor_Cents, M_Num, M_Den);
      Safe : constant Amount := Safe_Scaled (Account_Cents, E, M_Den);
      Next_Num : constant Amount :=
        Account_Next_Numerator (E, Safe, Price_Now, Price_Next);
      Threshold : constant Amount :=
        Floor_Threshold (Floor_Cents, Price_Now, M_Den);
      Gap_Loss : constant Amount := E * (Price_Now - Price_Next);
      Cushion_Value : constant Amount :=
        (Account_Cents - Floor_Cents) * M_Den * Price_Now;
   begin
      Prove_Exposure_And_Safe_Bounds
        (Account_Cents, Floor_Cents, M_Num, M_Den);
      pragma Assert (E + Safe = Account_Cents * M_Den);
      pragma Assert (Safe = Account_Cents * M_Den - E);
      pragma Assert
        (Next_Num = E * Price_Next
         + (Account_Cents * M_Den - E) * Price_Now);
      pragma Assert
        (Next_Num = Account_Cents * M_Den * Price_Now - Gap_Loss);
      pragma Assert
        (Account_Cents * M_Den * Price_Now
         - Floor_Cents * M_Den * Price_Now = Cushion_Value);
      pragma Assert (Gap_Loss <= Cushion_Value);
      pragma Assert
        (Account_Cents * M_Den * Price_Now - Gap_Loss
         >= Floor_Cents * M_Den * Price_Now);
      pragma Assert (Floor_Cents * M_Den * Price_Now = Threshold);
      pragma Assert (Next_Num >= Threshold);
   end Prove_Bounded_Down_Move_Preserves_Floor;

   procedure Prove_Floor_Branch_Coverage_Disjointness
     (Next_Num    : Amount;
      Floor_Cents : Amount;
      Price_Now   : Price;
      M_Den       : Ratio_Component) is
      Threshold : constant Amount :=
        Floor_Threshold (Floor_Cents, Price_Now, M_Den);
   begin
      if Next_Num >= Threshold then
         pragma Assert (Floor_Safe (Next_Num, Floor_Cents, Price_Now, M_Den));
         pragma Assert
           (not Floor_Breached (Next_Num, Floor_Cents, Price_Now, M_Den));
      else
         pragma Assert
           (Floor_Breached (Next_Num, Floor_Cents, Price_Now, M_Den));
         pragma Assert
           (not Floor_Safe (Next_Num, Floor_Cents, Price_Now, M_Den));
      end if;
   end Prove_Floor_Branch_Coverage_Disjointness;

   procedure Prove_Defensive_Branch_Zero_Risky_Exposure
     (Next_Num    : Amount;
      Floor_Cents : Amount;
      Price_Now   : Price;
      M_Den       : Ratio_Component) is
   begin
      pragma Assert
        (Floor_Breached (Next_Num, Floor_Cents, Price_Now, M_Den));
      pragma Assert (Defensive_Exposure_Scaled = 0);
   end Prove_Defensive_Branch_Zero_Risky_Exposure;

   procedure Prove_Floor_Safe_Next_Cushion_Nonnegative
     (Next_Num    : Amount;
      Floor_Cents : Amount;
      Price_Now   : Price;
      M_Den       : Ratio_Component) is
      Threshold : constant Amount :=
        Floor_Threshold (Floor_Cents, Price_Now, M_Den);
   begin
      pragma Assert (Next_Num >= Threshold);
      pragma Assert
        (Next_Cushion_Numerator (Next_Num, Floor_Cents, Price_Now, M_Den)
         = Next_Num - Threshold);
      pragma Assert
        (Next_Cushion_Numerator (Next_Num, Floor_Cents, Price_Now, M_Den)
         >= 0);
   end Prove_Floor_Safe_Next_Cushion_Nonnegative;

   procedure Prove_BTC_Funding_Split_Conservation
     (Collateral_Sats : Amount;
      Risky_Funding   : Amount) is
      Safe_Funding : constant Amount :=
        Safe_Funding_BTC (Collateral_Sats, Risky_Funding);
   begin
      pragma Assert (Safe_Funding = Collateral_Sats - Risky_Funding);
      pragma Assert (Safe_Funding >= 0);
      pragma Assert (Safe_Funding <= Collateral_Sats);
      pragma Assert (Risky_Funding + Safe_Funding = Collateral_Sats);
   end Prove_BTC_Funding_Split_Conservation;

   procedure Prove_Two_Step_Collateral_Conservation
     (Collateral_0 : Amount;
      Collateral_1 : Amount;
      Collateral_2 : Amount) is
   begin
      pragma Assert (Collateral_1 = Collateral_0);
      pragma Assert (Collateral_2 = Collateral_1);
      pragma Assert (Collateral_2 = Collateral_0);
   end Prove_Two_Step_Collateral_Conservation;

   procedure Prove_Gap_Risk_Counterexample is
      Next_Num : constant Amount := Account_Next_Numerator (100, 0, 100, 1);
      Threshold : constant Amount := Floor_Threshold (90, 100, 1);
   begin
      pragma Assert (Next_Num = 100);
      pragma Assert (Threshold = 9_000);
      pragma Assert (Next_Num < Threshold);
      pragma Assert (Floor_Breached (Next_Num, 90, 100, 1));
   end Prove_Gap_Risk_Counterexample;
end CPPI_Algebra;
