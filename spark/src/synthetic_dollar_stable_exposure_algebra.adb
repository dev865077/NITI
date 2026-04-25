pragma SPARK_Mode (On);

package body Synthetic_Dollar_Stable_Exposure_Algebra is
   procedure Prove_Need_Coverage
     (Target     : Amount;
      Settlement : Price;
      Need       : Amount) is
   begin
      pragma Assert (Need * Settlement >= Target);
      if Need = 0 then
         null;
      else
         pragma Assert ((Need - 1) * Settlement < Target);
      end if;
   end Prove_Need_Coverage;

   procedure Prove_Need_Zero_Target
     (Settlement : Price;
      Need       : Amount) is
   begin
      if Need > 0 then
         pragma Assert (Need >= 1);
         pragma Assert (Need - 1 >= 0);
         pragma Assert ((Need - 1) * Settlement >= 0);
         pragma Assert ((Need - 1) * Settlement < 0);
      end if;
      pragma Assert (Need = 0);
   end Prove_Need_Zero_Target;

   procedure Prove_Need_Rounding_Error
     (Target     : Amount;
      Settlement : Price;
      Need       : Amount) is
   begin
      pragma Assert (Need * Settlement >= Target);
      if Need = 0 then
         pragma Assert (Target > 0);
         pragma Assert (Need * Settlement = 0);
      else
         pragma Assert ((Need - 1) * Settlement < Target);
         pragma Assert (Need * Settlement = (Need - 1) * Settlement + Settlement);
         pragma Assert (Need * Settlement < Target + Settlement);
         pragma Assert (Need * Settlement - Target < Settlement);
      end if;
      pragma Assert (Need * Settlement - Target >= 0);
   end Prove_Need_Rounding_Error;

   procedure Prove_Need_Is_Least_Covering_Amount
     (Target     : Amount;
      Settlement : Price;
      Need       : Amount;
      Candidate  : Amount) is
   begin
      if Need = 0 then
         pragma Assert (Need <= Candidate);
      else
         pragma Assert ((Need - 1) * Settlement < Target);
         if Need > Candidate then
            pragma Assert (Need >= Candidate + 1);
            pragma Assert (Need - 1 >= Candidate);
            pragma Assert ((Need - 1) * Settlement >= Candidate * Settlement);
            pragma Assert ((Need - 1) * Settlement >= Target);
         end if;
      end if;
      pragma Assert (Need <= Candidate);
   end Prove_Need_Is_Least_Covering_Amount;

   procedure Prove_Branch_Coverage
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price) is
      Collateral_Value : constant Amount :=
        Value_Scaled (Collateral_Sats, Settlement);
      Target_Value : constant Amount := Target_Scaled (Target_Cents);
   begin
      if Collateral_Value >= Target_Value then
         pragma Assert (Par_Solvent (Collateral_Sats, Target_Cents, Settlement));
         pragma Assert (not Insolvent (Collateral_Sats, Target_Cents, Settlement));
      else
         pragma Assert (Insolvent (Collateral_Sats, Target_Cents, Settlement));
         pragma Assert (not Par_Solvent (Collateral_Sats, Target_Cents, Settlement));
      end if;
   end Prove_Branch_Coverage;

   procedure Prove_Par_Solvent_Cross_Multiply_Definition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price) is
   begin
      null;
   end Prove_Par_Solvent_Cross_Multiply_Definition;

   procedure Prove_Insolvent_Cross_Multiply_Definition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price) is
   begin
      null;
   end Prove_Insolvent_Cross_Multiply_Definition;

   procedure Prove_Stable_Claim_Bounded
     (Collateral_Sats : Amount;
      Need            : Amount) is
      Claim : constant Amount := Stable_Claim (Collateral_Sats, Need);
   begin
      if Collateral_Sats <= Need then
         pragma Assert (Claim = Collateral_Sats);
      else
         pragma Assert (Claim = Need);
      end if;
      pragma Assert (Claim >= 0);
      pragma Assert (Claim <= Collateral_Sats);
   end Prove_Stable_Claim_Bounded;

   procedure Prove_BTC_Conservation
     (Collateral_Sats : Amount;
      Claim           : Amount) is
      R : constant Amount := Residual (Collateral_Sats, Claim);
   begin
      pragma Assert (R = Collateral_Sats - Claim);
      pragma Assert (R >= 0);
      pragma Assert (Claim + R = Collateral_Sats);
   end Prove_BTC_Conservation;

   procedure Prove_Solvent_Branch
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      Need            : Amount) is
      Target_Value : constant Amount := Target_Scaled (Target_Cents);
      Claim : constant Amount := Stable_Claim (Collateral_Sats, Need);
   begin
      Prove_Need_Is_Least_Covering_Amount
        (Target_Value, Settlement, Need, Collateral_Sats);
      pragma Assert (Need <= Collateral_Sats);
      pragma Assert (Claim = Need);
      pragma Assert (Claim * Settlement >= Target_Value);
      Prove_BTC_Conservation (Collateral_Sats, Claim);
   end Prove_Solvent_Branch;

   procedure Prove_Insolvent_Branch
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      Need            : Amount) is
      Target_Value : constant Amount := Target_Scaled (Target_Cents);
      Claim : constant Amount := Stable_Claim (Collateral_Sats, Need);
   begin
      pragma Assert (Need * Settlement >= Target_Value);
      if Need <= Collateral_Sats then
         pragma Assert (Need * Settlement <= Collateral_Sats * Settlement);
         pragma Assert (Collateral_Sats * Settlement < Target_Value);
         pragma Assert (Need * Settlement < Target_Value);
      end if;
      pragma Assert (Need > Collateral_Sats);
      pragma Assert (Claim = Collateral_Sats);
      pragma Assert (Residual (Collateral_Sats, Claim) = 0);
      pragma Assert (Claim * Settlement < Target_Value);
   end Prove_Insolvent_Branch;

   procedure Prove_Solvent_Rounding_Error
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      Need            : Amount) is
      Target_Value : constant Amount := Target_Scaled (Target_Cents);
      Claim : constant Amount := Stable_Claim (Collateral_Sats, Need);
   begin
      Prove_Solvent_Branch
        (Collateral_Sats, Target_Cents, Settlement, Need);
      pragma Assert (Claim = Need);
      Prove_Need_Rounding_Error (Target_Value, Settlement, Need);
      pragma Assert (Claim * Settlement - Target_Value >= 0);
      pragma Assert (Claim * Settlement - Target_Value < Settlement);
   end Prove_Solvent_Rounding_Error;

   procedure Prove_Healthy_Cross_Multiply_Definition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      H_Num           : Ratio_Component;
      H_Den           : Ratio_Component) is
   begin
      null;
   end Prove_Healthy_Cross_Multiply_Definition;

   procedure Prove_Healthy_Roll_Preserves_Reserve
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      H_Num           : Ratio_Component;
      H_Den           : Ratio_Component) is
   begin
      pragma Assert (Rolled_Collateral (Collateral_Sats) = Collateral_Sats);
      pragma Assert (Rolled_Target (Target_Cents) = Target_Cents);
      pragma Assert
        (Healthy
           (Rolled_Collateral (Collateral_Sats),
            Rolled_Target (Target_Cents),
            Settlement,
            H_Num,
            H_Den));
   end Prove_Healthy_Roll_Preserves_Reserve;

   procedure Prove_Needs_DeRisk_Definition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      H_Num           : Ratio_Component;
      H_Den           : Ratio_Component) is
   begin
      null;
   end Prove_Needs_DeRisk_Definition;

   procedure Prove_DeRisk_Transition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Reduction_Cents : Amount;
      Settlement      : Price;
      Pay_Sats        : Amount;
      H_Num           : Ratio_Component;
      H_Den           : Ratio_Component) is
      Q_Next : constant Amount :=
        DeRisk_Collateral (Collateral_Sats, Pay_Sats);
      D_Next : constant Amount :=
        DeRisk_Target (Target_Cents, Reduction_Cents);
   begin
      Prove_Need_Coverage
        (Target_Scaled (Reduction_Cents), Settlement, Pay_Sats);
      pragma Assert (Pay_Sats + Q_Next = Collateral_Sats);
      pragma Assert (Reduction_Cents + D_Next = Target_Cents);
      pragma Assert (Q_Next >= 0);
      pragma Assert (Q_Next <= Collateral_Sats);
      pragma Assert (D_Next >= 0);
      pragma Assert (D_Next <= Target_Cents);
      pragma Assert
        (Healthy (Q_Next, D_Next, Settlement, H_Num, H_Den));
   end Prove_DeRisk_Transition;

   procedure Prove_Liquidation_Warning_Cross_Multiply_Definition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      L_Num           : Ratio_Component;
      L_Den           : Ratio_Component) is
   begin
      null;
   end Prove_Liquidation_Warning_Cross_Multiply_Definition;

   procedure Prove_Full_Collateral_Terminal_Only_When_Insolvent
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price) is
   begin
      null;
   end Prove_Full_Collateral_Terminal_Only_When_Insolvent;

   procedure Prove_Par_Solvent_Blocks_Full_Collateral_Terminal
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price) is
   begin
      Prove_Branch_Coverage
        (Collateral_Sats, Target_Cents, Settlement);
      pragma Assert
        (not Insolvent (Collateral_Sats, Target_Cents, Settlement));
      pragma Assert
        (not Full_Collateral_Terminal_Allowed
           (Collateral_Sats, Target_Cents, Settlement));
   end Prove_Par_Solvent_Blocks_Full_Collateral_Terminal;
end Synthetic_Dollar_Stable_Exposure_Algebra;
