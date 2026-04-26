pragma SPARK_Mode (On);

package body Collars_Protective_Notes_Algebra is
   procedure Prove_Protective_Put_Floor
     (Reference_Sats : Amount;
      Settlement     : Price;
      Put_Strike     : Price;
      Alpha_Den      : Ratio_Component) is
      Floor_Price : constant Amount := Max (Settlement, Put_Strike);
   begin
      if Settlement >= Put_Strike then
         pragma Assert (Floor_Price = Settlement);
         pragma Assert (Floor_Price >= Put_Strike);
      else
         pragma Assert (Floor_Price = Put_Strike);
      end if;
      pragma Assert
        (Protective_Put_Scaled
           (Reference_Sats, Settlement, Put_Strike, Alpha_Den)
         = Reference_Sats * Floor_Price * Alpha_Den);
      pragma Assert
        (Protective_Put_Scaled
           (Reference_Sats, Settlement, Put_Strike, Alpha_Den)
         >= Reference_Sats * Put_Strike * Alpha_Den);
   end Prove_Protective_Put_Floor;

   procedure Prove_Protective_Put_Continuity
     (Reference_Sats : Amount;
      Strike         : Price;
      Alpha_Den      : Ratio_Component) is
   begin
      pragma Assert (Max (Strike, Strike) = Strike);
      pragma Assert
        (Protective_Put_Scaled
           (Reference_Sats, Strike, Strike, Alpha_Den)
         = Reference_Sats * Strike * Alpha_Den);
   end Prove_Protective_Put_Continuity;

   procedure Prove_Collar_Branch_Coverage_Disjointness
     (Settlement  : Price;
      Put_Strike  : Price;
      Call_Strike : Price) is
   begin
      if Settlement < Put_Strike then
         pragma Assert (Collar_Lower_Branch (Settlement, Put_Strike));
         pragma Assert
           (not Collar_Middle_Branch
              (Settlement, Put_Strike, Call_Strike));
         pragma Assert (not Collar_Upper_Branch (Settlement, Call_Strike));
      elsif Settlement <= Call_Strike then
         pragma Assert
           (Collar_Middle_Branch (Settlement, Put_Strike, Call_Strike));
         pragma Assert (not Collar_Lower_Branch (Settlement, Put_Strike));
         pragma Assert (not Collar_Upper_Branch (Settlement, Call_Strike));
      else
         pragma Assert (Collar_Upper_Branch (Settlement, Call_Strike));
         pragma Assert (not Collar_Lower_Branch (Settlement, Put_Strike));
         pragma Assert
           (not Collar_Middle_Branch
              (Settlement, Put_Strike, Call_Strike));
      end if;
   end Prove_Collar_Branch_Coverage_Disjointness;

   procedure Prove_Collar_Floor_And_Cap
     (Reference_Sats : Amount;
      Settlement     : Price;
      Put_Strike     : Price;
      Call_Strike    : Price;
      Alpha_Den      : Ratio_Component) is
      Maxed : constant Amount := Max (Settlement, Put_Strike);
      Capped : constant Amount := Collar_Price
        (Settlement, Put_Strike, Call_Strike);
   begin
      if Settlement >= Put_Strike then
         pragma Assert (Maxed = Settlement);
         pragma Assert (Maxed >= Put_Strike);
      else
         pragma Assert (Maxed = Put_Strike);
      end if;

      if Maxed <= Call_Strike then
         pragma Assert (Capped = Maxed);
      else
         pragma Assert (Capped = Call_Strike);
      end if;

      pragma Assert (Capped >= Put_Strike);
      pragma Assert (Capped <= Call_Strike);
      pragma Assert
        (Collar_Scaled
           (Reference_Sats, Settlement, Put_Strike, Call_Strike, Alpha_Den)
         = Reference_Sats * Capped * Alpha_Den);
      pragma Assert
        (Reference_Sats * Put_Strike * Alpha_Den
         <= Reference_Sats * Capped * Alpha_Den);
      pragma Assert
        (Reference_Sats * Capped * Alpha_Den
         <= Reference_Sats * Call_Strike * Alpha_Den);
   end Prove_Collar_Floor_And_Cap;

   procedure Prove_Collar_Continuity
     (Reference_Sats : Amount;
      Put_Strike     : Price;
      Call_Strike    : Price;
      Alpha_Den      : Ratio_Component) is
   begin
      pragma Assert (Max (Put_Strike, Put_Strike) = Put_Strike);
      pragma Assert (Collar_Price (Put_Strike, Put_Strike, Call_Strike)
                     = Put_Strike);
      pragma Assert
        (Collar_Scaled
           (Reference_Sats, Put_Strike, Put_Strike, Call_Strike, Alpha_Den)
         = Reference_Sats * Put_Strike * Alpha_Den);

      pragma Assert (Max (Call_Strike, Put_Strike) = Call_Strike);
      pragma Assert (Collar_Price (Call_Strike, Put_Strike, Call_Strike)
                     = Call_Strike);
      pragma Assert
        (Collar_Scaled
           (Reference_Sats, Call_Strike, Put_Strike, Call_Strike, Alpha_Den)
         = Reference_Sats * Call_Strike * Alpha_Den);
   end Prove_Collar_Continuity;

   procedure Prove_Note_Principal_Protection
     (Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Settlement      : Price;
      Initial         : Price;
      Call_Strike     : Price;
      Alpha_Num       : Ratio_Component;
      Alpha_Den       : Ratio_Component) is
      Upside : constant Amount :=
        Capped_Upside (Settlement, Initial, Call_Strike);
      Participation : constant Amount :=
        Reference_Sats * Upside * Alpha_Num;
   begin
      pragma Assert (Upside >= 0);
      pragma Assert (Participation >= 0);
      pragma Assert
        (Note_Scaled
           (Principal_Cents,
            Reference_Sats,
            Settlement,
            Initial,
            Call_Strike,
            Alpha_Num,
            Alpha_Den)
         = Principal_Cents * SAT * Alpha_Den + Participation);
      pragma Assert
        (Note_Scaled
           (Principal_Cents,
            Reference_Sats,
            Settlement,
            Initial,
            Call_Strike,
            Alpha_Num,
            Alpha_Den)
         >= Principal_Cents * SAT * Alpha_Den);
   end Prove_Note_Principal_Protection;

   procedure Prove_Note_Upside_Cap
     (Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Settlement      : Price;
      Initial         : Price;
      Call_Strike     : Price;
      Alpha_Num       : Ratio_Component;
      Alpha_Den       : Ratio_Component) is
      Upside : constant Amount :=
        Capped_Upside (Settlement, Initial, Call_Strike);
   begin
      if Pos_Diff (Settlement, Initial) <= Call_Strike - Initial then
         pragma Assert (Upside = Pos_Diff (Settlement, Initial));
      else
         pragma Assert (Upside = Call_Strike - Initial);
      end if;
      pragma Assert (Upside <= Call_Strike - Initial);
      pragma Assert
        (Reference_Sats * Upside * Alpha_Num
         <= Reference_Sats * (Call_Strike - Initial) * Alpha_Num);
      pragma Assert
        (Note_Scaled
           (Principal_Cents,
            Reference_Sats,
            Settlement,
            Initial,
            Call_Strike,
            Alpha_Num,
            Alpha_Den)
         <= Principal_Cents * SAT * Alpha_Den
            + Reference_Sats * (Call_Strike - Initial) * Alpha_Num);
   end Prove_Note_Upside_Cap;

   procedure Prove_Note_Branch_Coverage_Disjointness
     (Settlement  : Price;
      Initial     : Price;
      Call_Strike : Price) is
   begin
      if Settlement <= Initial then
         pragma Assert (Note_Principal_Branch (Settlement, Initial));
         pragma Assert
           (not Note_Participation_Branch
              (Settlement, Initial, Call_Strike));
         pragma Assert (not Note_Capped_Branch (Settlement, Call_Strike));
      elsif Settlement < Call_Strike then
         pragma Assert
           (Note_Participation_Branch (Settlement, Initial, Call_Strike));
         pragma Assert (not Note_Principal_Branch (Settlement, Initial));
         pragma Assert (not Note_Capped_Branch (Settlement, Call_Strike));
      else
         pragma Assert (Note_Capped_Branch (Settlement, Call_Strike));
         pragma Assert (not Note_Principal_Branch (Settlement, Initial));
         pragma Assert
           (not Note_Participation_Branch
              (Settlement, Initial, Call_Strike));
      end if;
   end Prove_Note_Branch_Coverage_Disjointness;

   procedure Prove_Note_Continuity
     (Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Initial         : Price;
      Call_Strike     : Price;
      Alpha_Num       : Ratio_Component;
      Alpha_Den       : Ratio_Component) is
   begin
      pragma Assert (Pos_Diff (Initial, Initial) = 0);
      pragma Assert (Capped_Upside (Initial, Initial, Call_Strike) = 0);
      pragma Assert
        (Note_Scaled
           (Principal_Cents,
            Reference_Sats,
            Initial,
            Initial,
            Call_Strike,
            Alpha_Num,
            Alpha_Den)
         = Principal_Cents * SAT * Alpha_Den);

      pragma Assert (Pos_Diff (Call_Strike, Initial)
                     = Call_Strike - Initial);
      pragma Assert
        (Capped_Upside (Call_Strike, Initial, Call_Strike)
         = Call_Strike - Initial);
      pragma Assert
        (Note_Scaled
           (Principal_Cents,
            Reference_Sats,
            Call_Strike,
            Initial,
            Call_Strike,
            Alpha_Num,
            Alpha_Den)
         =
         Principal_Cents * SAT * Alpha_Den
         + Reference_Sats * (Call_Strike - Initial) * Alpha_Num);
   end Prove_Note_Continuity;

   procedure Prove_Claim_Ceil_Covers
     (Payoff_Scaled : Amount;
      Unit          : Amount;
      Claim_Sats    : Amount) is
   begin
      pragma Assert (Claim_Sats * Unit >= Payoff_Scaled);
   end Prove_Claim_Ceil_Covers;

   procedure Prove_Claim_Rounding_Error
     (Payoff_Scaled : Amount;
      Unit          : Amount;
      Claim_Sats    : Amount) is
   begin
      pragma Assert (Claim_Sats * Unit >= Payoff_Scaled);
      if Claim_Sats = 0 then
         pragma Assert (Payoff_Scaled > 0);
         pragma Assert (Claim_Sats * Unit = 0);
      else
         pragma Assert ((Claim_Sats - 1) * Unit < Payoff_Scaled);
         pragma Assert (Claim_Sats * Unit =
                        (Claim_Sats - 1) * Unit + Unit);
         pragma Assert (Claim_Sats * Unit < Payoff_Scaled + Unit);
         pragma Assert (Claim_Sats * Unit - Payoff_Scaled < Unit);
      end if;
      pragma Assert (Claim_Sats * Unit - Payoff_Scaled >= 0);
   end Prove_Claim_Rounding_Error;

   procedure Prove_BTC_Conservation
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount) is
      Investor : constant Amount := Investor_BTC (Collateral_Sats, Claim_Sats);
      Structurer : constant Amount :=
        Structurer_BTC (Collateral_Sats, Claim_Sats);
   begin
      if Claim_Sats <= Collateral_Sats then
         pragma Assert (Investor = Claim_Sats);
         pragma Assert (Structurer = Collateral_Sats - Claim_Sats);
      else
         pragma Assert (Investor = Collateral_Sats);
         pragma Assert (Structurer = 0);
      end if;

      pragma Assert (Investor >= 0);
      pragma Assert (Investor <= Collateral_Sats);
      pragma Assert (Structurer >= 0);
      pragma Assert (Structurer <= Collateral_Sats);
      pragma Assert (Investor + Structurer = Collateral_Sats);
   end Prove_BTC_Conservation;

   procedure Prove_Sufficient_Collateral_Covers_Payoff
     (Collateral_Sats : Amount;
      Payoff_Scaled   : Amount;
      Unit            : Amount;
      Claim_Sats      : Amount) is
      Investor : constant Amount := Investor_BTC (Collateral_Sats, Claim_Sats);
   begin
      pragma Assert (Investor = Claim_Sats);
      Prove_Claim_Ceil_Covers (Payoff_Scaled, Unit, Claim_Sats);
      pragma Assert (Investor * Unit >= Payoff_Scaled);
   end Prove_Sufficient_Collateral_Covers_Payoff;

   procedure Prove_Principal_Protection_After_BTC_Conversion
     (Collateral_Sats : Amount;
      Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Settlement      : Price;
      Initial         : Price;
      Call_Strike     : Price;
      Alpha_Num       : Ratio_Component;
      Alpha_Den       : Ratio_Component;
      Claim_Sats      : Amount) is
      Payoff : constant Amount :=
        Note_Scaled
          (Principal_Cents,
           Reference_Sats,
           Settlement,
           Initial,
           Call_Strike,
           Alpha_Num,
           Alpha_Den);
      Unit : constant Amount := Claim_Unit (Settlement, Alpha_Den);
      Investor : constant Amount := Investor_BTC (Collateral_Sats, Claim_Sats);
   begin
      Prove_Note_Principal_Protection
        (Principal_Cents,
         Reference_Sats,
         Settlement,
         Initial,
         Call_Strike,
         Alpha_Num,
         Alpha_Den);
      Prove_Sufficient_Collateral_Covers_Payoff
        (Collateral_Sats, Payoff, Unit, Claim_Sats);
      pragma Assert (Payoff >= Principal_Cents * SAT * Alpha_Den);
      pragma Assert (Investor * Unit >= Payoff);
      pragma Assert
        (Investor * Unit >= Principal_Cents * SAT * Alpha_Den);
   end Prove_Principal_Protection_After_BTC_Conversion;

   procedure Prove_Zero_Cost_Premium
     (Premium_Put_Cents  : Amount;
      Premium_Call_Cents : Amount) is
   begin
      pragma Assert (Premium_Put_Cents - Premium_Call_Cents = 0);
      pragma Assert (Net_Premium (Premium_Put_Cents, Premium_Call_Cents) = 0);
   end Prove_Zero_Cost_Premium;
end Collars_Protective_Notes_Algebra;
