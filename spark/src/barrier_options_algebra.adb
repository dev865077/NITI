pragma SPARK_Mode (On);

package body Barrier_Options_Algebra is
   procedure Prove_Up_Barrier_Branch_Coverage
     (Settlement : Price;
      Barrier    : Price) is
   begin
      if Settlement >= Barrier then
         pragma Assert (Hit_Up (Settlement, Barrier));
         pragma Assert (not Miss_Up (Settlement, Barrier));
      else
         pragma Assert (Miss_Up (Settlement, Barrier));
         pragma Assert (not Hit_Up (Settlement, Barrier));
      end if;
   end Prove_Up_Barrier_Branch_Coverage;

   procedure Prove_Down_Barrier_Branch_Coverage
     (Settlement : Price;
      Barrier    : Price) is
   begin
      if Settlement <= Barrier then
         pragma Assert (Hit_Down (Settlement, Barrier));
         pragma Assert (not Miss_Down (Settlement, Barrier));
      else
         pragma Assert (Miss_Down (Settlement, Barrier));
         pragma Assert (not Hit_Down (Settlement, Barrier));
      end if;
   end Prove_Down_Barrier_Branch_Coverage;

   procedure Prove_Touch_Monotonicity
     (Touched : Boolean;
      Hit     : Boolean) is
   begin
      pragma Assert (Touched);
      pragma Assert (Next_Touched (Touched, Hit));
   end Prove_Touch_Monotonicity;

   procedure Prove_Touch_Activation
     (Touched : Boolean;
      Hit     : Boolean) is
   begin
      pragma Assert (not Touched);
      pragma Assert (Hit);
      pragma Assert (Next_Touched (Touched, Hit));
   end Prove_Touch_Activation;

   procedure Prove_Touch_False_Only_If_Missed
     (Touched : Boolean;
      Hit     : Boolean) is
   begin
      pragma Assert (not Next_Touched (Touched, Hit));
      pragma Assert (not Touched);
      pragma Assert (not Hit);
   end Prove_Touch_False_Only_If_Missed;

   procedure Prove_Knock_Out_Absorption
     (Live : Boolean;
      Miss : Boolean) is
   begin
      pragma Assert (not Live);
      pragma Assert (not Next_Live (Live, Miss));
   end Prove_Knock_Out_Absorption;

   procedure Prove_Live_Continuation_Requires_Live_And_Miss
     (Live : Boolean;
      Miss : Boolean) is
   begin
      pragma Assert (Next_Live (Live, Miss));
      pragma Assert (Live);
      pragma Assert (Miss);
   end Prove_Live_Continuation_Requires_Live_And_Miss;

   procedure Prove_Pure_Observation_Preserves_Collateral
     (Collateral_Sats : Amount) is
   begin
      pragma Assert (Next_Collateral (Collateral_Sats) = Collateral_Sats);
   end Prove_Pure_Observation_Preserves_Collateral;

   procedure Prove_Rebate_Termination_Conservation
     (Collateral_Sats : Amount;
      Payout_Cents    : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount) is
      Paid : constant Amount := Option_Holder_BTC
        (Collateral_Sats, Claim_Sats);
      Residual : constant Amount := Residual_BTC
        (Collateral_Sats, Claim_Sats);
   begin
      if Claim_Sats <= Collateral_Sats then
         pragma Assert (Paid = Claim_Sats);
         pragma Assert (Residual = Collateral_Sats - Claim_Sats);
      else
         pragma Assert (Paid = Collateral_Sats);
         pragma Assert (Residual = 0);
      end if;

      pragma Assert (Paid >= 0);
      pragma Assert (Paid <= Collateral_Sats);
      pragma Assert (Residual >= 0);
      pragma Assert (Residual <= Collateral_Sats);
      pragma Assert (Paid + Residual = Collateral_Sats);
   end Prove_Rebate_Termination_Conservation;

   procedure Prove_Vanilla_Payoffs_Nonnegative
     (Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) is
   begin
      if Settlement > Strike then
         pragma Assert (Settlement - Strike > 0);
         pragma Assert
           (Call_Scaled (Settlement, Strike, Reference_Sats)
            = Reference_Sats * (Settlement - Strike));
      else
         pragma Assert (Call_Scaled (Settlement, Strike, Reference_Sats) = 0);
      end if;

      if Strike > Settlement then
         pragma Assert (Strike - Settlement > 0);
         pragma Assert
           (Put_Scaled (Settlement, Strike, Reference_Sats)
            = Reference_Sats * (Strike - Settlement));
      else
         pragma Assert (Put_Scaled (Settlement, Strike, Reference_Sats) = 0);
      end if;

      pragma Assert (Call_Scaled (Settlement, Strike, Reference_Sats) >= 0);
      pragma Assert (Put_Scaled (Settlement, Strike, Reference_Sats) >= 0);
   end Prove_Vanilla_Payoffs_Nonnegative;

   procedure Prove_Knock_In_Equals_Vanilla_After_Activation
     (Touched        : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) is
   begin
      pragma Assert (Touched);
      pragma Assert
        (Knock_In_Call_Scaled (Touched, Settlement, Strike, Reference_Sats)
         = Call_Scaled (Settlement, Strike, Reference_Sats));
      pragma Assert
        (Knock_In_Put_Scaled (Touched, Settlement, Strike, Reference_Sats)
         = Put_Scaled (Settlement, Strike, Reference_Sats));
   end Prove_Knock_In_Equals_Vanilla_After_Activation;

   procedure Prove_Knock_In_Zero_Without_Activation
     (Touched        : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) is
   begin
      pragma Assert (not Touched);
      pragma Assert
        (Knock_In_Call_Scaled (Touched, Settlement, Strike, Reference_Sats)
         = 0);
      pragma Assert
        (Knock_In_Put_Scaled (Touched, Settlement, Strike, Reference_Sats)
         = 0);
   end Prove_Knock_In_Zero_Without_Activation;

   procedure Prove_Knock_Out_Equals_Vanilla_While_Live
     (Live           : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) is
   begin
      pragma Assert (Live);
      pragma Assert
        (Knock_Out_Call_Scaled (Live, Settlement, Strike, Reference_Sats)
         = Call_Scaled (Settlement, Strike, Reference_Sats));
      pragma Assert
        (Knock_Out_Put_Scaled (Live, Settlement, Strike, Reference_Sats)
         = Put_Scaled (Settlement, Strike, Reference_Sats));
   end Prove_Knock_Out_Equals_Vanilla_While_Live;

   procedure Prove_Knock_Out_Zero_After_Knock_Out
     (Live           : Boolean;
      Settlement     : Price;
      Strike         : Price;
      Reference_Sats : Amount) is
   begin
      pragma Assert (not Live);
      pragma Assert
        (Knock_Out_Call_Scaled (Live, Settlement, Strike, Reference_Sats)
         = 0);
      pragma Assert
        (Knock_Out_Put_Scaled (Live, Settlement, Strike, Reference_Sats)
         = 0);
   end Prove_Knock_Out_Zero_After_Knock_Out;

   procedure Prove_One_Touch_Zero_If_Never_Touched
     (Touched      : Boolean;
      Payout_Cents : Amount) is
   begin
      pragma Assert (not Touched);
      pragma Assert (One_Touch_Scaled (Touched, Payout_Cents) = 0);
   end Prove_One_Touch_Zero_If_Never_Touched;

   procedure Prove_No_Touch_Zero_If_Touched
     (Live         : Boolean;
      Payout_Cents : Amount) is
   begin
      pragma Assert (not Live);
      pragma Assert (No_Touch_Scaled (Live, Payout_Cents) = 0);
   end Prove_No_Touch_Zero_If_Touched;

   procedure Prove_Claim_Ceil_Covers
     (Payoff_Scaled : Amount;
      Settlement    : Price;
      Claim_Sats    : Amount) is
   begin
      pragma Assert (Claim_Sats * Settlement >= Payoff_Scaled);
   end Prove_Claim_Ceil_Covers;

   procedure Prove_Claim_Rounding_Error_Positive
     (Payoff_Scaled : Amount;
      Settlement    : Price;
      Claim_Sats    : Amount) is
   begin
      pragma Assert (Claim_Sats * Settlement >= Payoff_Scaled);
      if Claim_Sats = 0 then
         pragma Assert (Claim_Sats * Settlement = 0);
         pragma Assert (Payoff_Scaled > 0);
      else
         pragma Assert ((Claim_Sats - 1) * Settlement < Payoff_Scaled);
         pragma Assert (Claim_Sats * Settlement =
                        (Claim_Sats - 1) * Settlement + Settlement);
         pragma Assert (Claim_Sats * Settlement < Payoff_Scaled + Settlement);
         pragma Assert
           (Claim_Sats * Settlement - Payoff_Scaled < Settlement);
      end if;
      pragma Assert (Claim_Sats * Settlement - Payoff_Scaled >= 0);
   end Prove_Claim_Rounding_Error_Positive;

   procedure Prove_Claim_Rounding_Error_Zero
     (Payoff_Scaled : Amount;
      Settlement    : Price;
      Claim_Sats    : Amount) is
   begin
      pragma Assert (Payoff_Scaled = 0);
      if Claim_Sats = 0 then
         pragma Assert (Claim_Sats * Settlement = 0);
      else
         pragma Assert ((Claim_Sats - 1) * Settlement < Payoff_Scaled);
         pragma Assert (Claim_Sats - 1 >= 0);
         pragma Assert ((Claim_Sats - 1) * Settlement >= 0);
      end if;
      pragma Assert (Claim_Sats = 0);
      pragma Assert (Claim_Sats * Settlement - Payoff_Scaled = 0);
   end Prove_Claim_Rounding_Error_Zero;

   procedure Prove_BTC_Settlement_Conservation
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount) is
      Holder : constant Amount := Option_Holder_BTC
        (Collateral_Sats, Claim_Sats);
      Residual : constant Amount := Residual_BTC
        (Collateral_Sats, Claim_Sats);
   begin
      if Claim_Sats <= Collateral_Sats then
         pragma Assert (Holder = Claim_Sats);
         pragma Assert (Residual = Collateral_Sats - Claim_Sats);
      else
         pragma Assert (Holder = Collateral_Sats);
         pragma Assert (Residual = 0);
      end if;

      pragma Assert (Holder >= 0);
      pragma Assert (Holder <= Collateral_Sats);
      pragma Assert (Residual >= 0);
      pragma Assert (Residual <= Collateral_Sats);
      pragma Assert (Holder + Residual = Collateral_Sats);
   end Prove_BTC_Settlement_Conservation;

   procedure Prove_Sufficient_Collateral_Covers_Payoff
     (Collateral_Sats : Amount;
      Payoff_Scaled   : Amount;
      Settlement      : Price;
      Claim_Sats      : Amount) is
      Holder : constant Amount := Option_Holder_BTC
        (Collateral_Sats, Claim_Sats);
   begin
      pragma Assert (Holder = Claim_Sats);
      Prove_Claim_Ceil_Covers (Payoff_Scaled, Settlement, Claim_Sats);
      pragma Assert (Holder * Settlement >= Payoff_Scaled);
   end Prove_Sufficient_Collateral_Covers_Payoff;

   procedure Prove_One_Step_Touch_Characterization
     (Initial_Touched : Boolean;
      Hit_0           : Boolean) is
   begin
      pragma Assert
        (Next_Touched (Initial_Touched, Hit_0)
         = (Initial_Touched or Hit_0));
   end Prove_One_Step_Touch_Characterization;

   procedure Prove_Two_Step_Touch_Characterization
     (Initial_Touched : Boolean;
      Hit_0           : Boolean;
      Hit_1           : Boolean) is
   begin
      Prove_One_Step_Touch_Characterization (Initial_Touched, Hit_0);
      pragma Assert
        (Next_Touched (Initial_Touched, Hit_0)
         = (Initial_Touched or Hit_0));
      pragma Assert
        (Two_Step_Touched (Initial_Touched, Hit_0, Hit_1)
         = ((Initial_Touched or Hit_0) or Hit_1));
      pragma Assert
        (Two_Step_Touched (Initial_Touched, Hit_0, Hit_1)
         = (Initial_Touched or Hit_0 or Hit_1));
   end Prove_Two_Step_Touch_Characterization;
end Barrier_Options_Algebra;
