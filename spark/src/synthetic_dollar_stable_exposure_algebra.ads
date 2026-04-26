pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Synthetic_Dollar_Stable_Exposure_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Price is Valid_Big_Integer;
   subtype Ratio_Component is Valid_Big_Integer;

   SAT : constant Amount := 100_000_000;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);

   function Min (A, B : Amount) return Amount is
     (if A <= B then A else B)
   with
     Pre => Nonnegative (A) and Nonnegative (B);

   --  #8: TargetScaled(D) = D * B, where B is satoshis per BTC.
   function Target_Scaled (Target_Cents : Amount) return Amount is
     (Target_Cents * SAT)
   with
     Pre => Nonnegative (Target_Cents);

   --  #8: ValueScaled(q, P) = q * P.
   function Value_Scaled
     (Collateral_Sats : Amount;
      Settlement      : Price) return Amount
   is (Collateral_Sats * Settlement)
   with
     Pre => Nonnegative (Collateral_Sats) and Positive (Settlement);

   --  #8 quotient witness for Need(D, P) = ceil((D * B) / P):
   --    Need * P >= D * B
   --    Need = 0 or (Need - 1) * P < D * B.
   --  The witness is supplied explicitly so the model avoids executable
   --  division and proves the integer settlement algebra directly.
   function Valid_Ceil_Need
     (Target    : Amount;
      Settlement : Price;
      Need      : Amount) return Boolean
   is
     (Need * Settlement >= Target
      and then
        (Need = 0 or else (Need - 1) * Settlement < Target))
   with
     Pre =>
       Nonnegative (Target)
       and Positive (Settlement)
       and Nonnegative (Need);

   function Stable_Claim
     (Collateral_Sats : Amount;
      Need            : Amount) return Amount
   is (Min (Collateral_Sats, Need))
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Need);

   function Residual
     (Collateral_Sats : Amount;
      Claim           : Amount) return Amount
   is (Collateral_Sats - Claim)
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Claim)
       and Claim <= Collateral_Sats;

   --  #8: ParSolvent iff Q * P >= D * B.
   function Par_Solvent
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price) return Boolean
   is
     (Value_Scaled (Collateral_Sats, Settlement)
      >= Target_Scaled (Target_Cents))
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement);

   --  #8: Insolvent iff Q * P < D * B.
   function Insolvent
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price) return Boolean
   is
     (Value_Scaled (Collateral_Sats, Settlement)
      < Target_Scaled (Target_Cents))
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement);

   --  #8: Healthy iff Q * P * H_den >= D * B * H_num.
   function Healthy
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      H_Num           : Ratio_Component;
      H_Den           : Ratio_Component) return Boolean
   is
     (Collateral_Sats * Settlement * H_Den
      >= Target_Scaled (Target_Cents) * H_Num)
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement)
       and Nonnegative (H_Num)
       and Positive (H_Den);

   function Needs_DeRisk
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      H_Num           : Ratio_Component;
      H_Den           : Ratio_Component) return Boolean
   is
     (Par_Solvent (Collateral_Sats, Target_Cents, Settlement)
      and then
        not Healthy
          (Collateral_Sats, Target_Cents, Settlement, H_Num, H_Den))
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement)
       and Nonnegative (H_Num)
       and Positive (H_Den);

   function Rolled_Collateral (Collateral_Sats : Amount) return Amount is
     (Collateral_Sats)
   with
     Pre => Nonnegative (Collateral_Sats);

   function Rolled_Target (Target_Cents : Amount) return Amount is
     (Target_Cents)
   with
     Pre => Nonnegative (Target_Cents);

   function DeRisk_Collateral
     (Collateral_Sats : Amount;
      Pay_Sats        : Amount) return Amount
   is (Collateral_Sats - Pay_Sats)
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Pay_Sats)
       and Pay_Sats <= Collateral_Sats;

   function DeRisk_Target
     (Target_Cents    : Amount;
      Reduction_Cents : Amount) return Amount
   is (Target_Cents - Reduction_Cents)
   with
     Pre =>
       Nonnegative (Target_Cents)
       and Nonnegative (Reduction_Cents)
       and Reduction_Cents <= Target_Cents;

   --  #8: liquidation-warning predicate, distinct from terminal insolvency.
   function Below_Liquidation_Threshold
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      L_Num           : Ratio_Component;
      L_Den           : Ratio_Component) return Boolean
   is
     (Collateral_Sats * Settlement * L_Den
      < Target_Scaled (Target_Cents) * L_Num)
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement)
       and Nonnegative (L_Num)
       and Positive (L_Den);

   function Full_Collateral_Terminal_Allowed
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price) return Boolean
   is (Insolvent (Collateral_Sats, Target_Cents, Settlement))
   with
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement);

   procedure Prove_Need_Coverage
     (Target     : Amount;
      Settlement : Price;
      Need       : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Target)
       and then Positive (Settlement)
       and then Nonnegative (Need)
       and then Valid_Ceil_Need (Target, Settlement, Need),
     Post =>
       Need * Settlement >= Target
       and (Need = 0 or else (Need - 1) * Settlement < Target);

   procedure Prove_Need_Zero_Target
     (Settlement : Price;
      Need       : Amount)
   with
     Global => null,
     Pre =>
       Positive (Settlement)
       and then Nonnegative (Need)
       and then Valid_Ceil_Need (0, Settlement, Need),
     Post => Need = 0;

   procedure Prove_Need_Rounding_Error
     (Target     : Amount;
      Settlement : Price;
      Need       : Amount)
   with
     Global => null,
     Pre =>
       Positive (Target)
       and then Positive (Settlement)
       and then Nonnegative (Need)
       and then Valid_Ceil_Need (Target, Settlement, Need),
     Post =>
       Need * Settlement - Target >= 0
       and Need * Settlement - Target < Settlement;

   procedure Prove_Need_Is_Least_Covering_Amount
     (Target     : Amount;
      Settlement : Price;
      Need       : Amount;
      Candidate  : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Target)
       and then Positive (Settlement)
       and then Nonnegative (Need)
       and then Nonnegative (Candidate)
       and then Valid_Ceil_Need (Target, Settlement, Need)
       and then Candidate * Settlement >= Target,
     Post => Need <= Candidate;

   procedure Prove_Branch_Coverage
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement),
     Post =>
       (Par_Solvent (Collateral_Sats, Target_Cents, Settlement)
        or Insolvent (Collateral_Sats, Target_Cents, Settlement))
       and
       (Par_Solvent (Collateral_Sats, Target_Cents, Settlement)
        /= Insolvent (Collateral_Sats, Target_Cents, Settlement));

   procedure Prove_Par_Solvent_Cross_Multiply_Definition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement),
     Post =>
       Par_Solvent (Collateral_Sats, Target_Cents, Settlement)
       =
       (Collateral_Sats * Settlement >= Target_Scaled (Target_Cents));

   procedure Prove_Insolvent_Cross_Multiply_Definition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement),
     Post =>
       Insolvent (Collateral_Sats, Target_Cents, Settlement)
       =
       (Collateral_Sats * Settlement < Target_Scaled (Target_Cents));

   procedure Prove_Stable_Claim_Bounded
     (Collateral_Sats : Amount;
      Need            : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Need),
     Post =>
       Stable_Claim (Collateral_Sats, Need) >= 0
       and Stable_Claim (Collateral_Sats, Need) <= Collateral_Sats;

   procedure Prove_BTC_Conservation
     (Collateral_Sats : Amount;
      Claim           : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Claim)
       and Claim <= Collateral_Sats,
     Post =>
       Claim + Residual (Collateral_Sats, Claim) = Collateral_Sats
       and Residual (Collateral_Sats, Claim) >= 0;

   procedure Prove_Solvent_Branch
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      Need            : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Target_Cents)
       and then Positive (Settlement)
       and then Nonnegative (Need)
       and then Valid_Ceil_Need
         (Target_Scaled (Target_Cents), Settlement, Need)
       and then Par_Solvent (Collateral_Sats, Target_Cents, Settlement),
     Post =>
       Stable_Claim (Collateral_Sats, Need) = Need
       and Need <= Collateral_Sats
       and Stable_Claim (Collateral_Sats, Need) * Settlement
         >= Target_Scaled (Target_Cents)
       and Stable_Claim (Collateral_Sats, Need)
         + Residual (Collateral_Sats, Stable_Claim (Collateral_Sats, Need))
         = Collateral_Sats;

   procedure Prove_Insolvent_Branch
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      Need            : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Target_Cents)
       and then Positive (Settlement)
       and then Nonnegative (Need)
       and then Valid_Ceil_Need
         (Target_Scaled (Target_Cents), Settlement, Need)
       and then Insolvent (Collateral_Sats, Target_Cents, Settlement),
     Post =>
       Stable_Claim (Collateral_Sats, Need) = Collateral_Sats
       and Residual
         (Collateral_Sats, Stable_Claim (Collateral_Sats, Need)) = 0
       and Stable_Claim (Collateral_Sats, Need) * Settlement
         < Target_Scaled (Target_Cents);

   procedure Prove_Solvent_Rounding_Error
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      Need            : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Positive (Target_Cents)
       and then Positive (Settlement)
       and then Nonnegative (Need)
       and then Valid_Ceil_Need
         (Target_Scaled (Target_Cents), Settlement, Need)
       and then Par_Solvent (Collateral_Sats, Target_Cents, Settlement),
     Post =>
       Stable_Claim (Collateral_Sats, Need) * Settlement
         - Target_Scaled (Target_Cents) >= 0
       and Stable_Claim (Collateral_Sats, Need) * Settlement
         - Target_Scaled (Target_Cents) < Settlement;

   procedure Prove_Healthy_Cross_Multiply_Definition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      H_Num           : Ratio_Component;
      H_Den           : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement)
       and Nonnegative (H_Num)
       and Positive (H_Den),
     Post =>
       Healthy
         (Collateral_Sats, Target_Cents, Settlement, H_Num, H_Den)
       =
       (Collateral_Sats * Settlement * H_Den
        >= Target_Scaled (Target_Cents) * H_Num);

   procedure Prove_Healthy_Roll_Preserves_Reserve
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      H_Num           : Ratio_Component;
      H_Den           : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Target_Cents)
       and then Positive (Settlement)
       and then Nonnegative (H_Num)
       and then Positive (H_Den)
       and then Healthy
         (Collateral_Sats, Target_Cents, Settlement, H_Num, H_Den),
     Post =>
       Rolled_Collateral (Collateral_Sats) = Collateral_Sats
       and Rolled_Target (Target_Cents) = Target_Cents
       and Healthy
         (Rolled_Collateral (Collateral_Sats),
          Rolled_Target (Target_Cents),
          Settlement,
          H_Num,
          H_Den);

   procedure Prove_Needs_DeRisk_Definition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      H_Num           : Ratio_Component;
      H_Den           : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement)
       and Nonnegative (H_Num)
       and Positive (H_Den),
     Post =>
       Needs_DeRisk
         (Collateral_Sats, Target_Cents, Settlement, H_Num, H_Den)
       =
       (Par_Solvent (Collateral_Sats, Target_Cents, Settlement)
        and then
          not Healthy
            (Collateral_Sats, Target_Cents, Settlement, H_Num, H_Den));

   procedure Prove_DeRisk_Transition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Reduction_Cents : Amount;
      Settlement      : Price;
      Pay_Sats        : Amount;
      H_Num           : Ratio_Component;
      H_Den           : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Target_Cents)
       and then Nonnegative (Reduction_Cents)
       and then Reduction_Cents <= Target_Cents
       and then Positive (Settlement)
       and then Nonnegative (Pay_Sats)
       and then Valid_Ceil_Need
         (Target_Scaled (Reduction_Cents), Settlement, Pay_Sats)
       and then Pay_Sats <= Collateral_Sats
       and then Nonnegative (H_Num)
       and then Positive (H_Den)
       and then Healthy
         (DeRisk_Collateral (Collateral_Sats, Pay_Sats),
          DeRisk_Target (Target_Cents, Reduction_Cents),
          Settlement,
          H_Num,
          H_Den),
     Post =>
       Pay_Sats + DeRisk_Collateral (Collateral_Sats, Pay_Sats)
         = Collateral_Sats
       and Reduction_Cents
         + DeRisk_Target (Target_Cents, Reduction_Cents) = Target_Cents
       and DeRisk_Collateral (Collateral_Sats, Pay_Sats) >= 0
       and DeRisk_Collateral (Collateral_Sats, Pay_Sats) <= Collateral_Sats
       and DeRisk_Target (Target_Cents, Reduction_Cents) >= 0
       and DeRisk_Target (Target_Cents, Reduction_Cents) <= Target_Cents
       and Pay_Sats * Settlement >= Target_Scaled (Reduction_Cents)
       and Healthy
         (DeRisk_Collateral (Collateral_Sats, Pay_Sats),
          DeRisk_Target (Target_Cents, Reduction_Cents),
          Settlement,
          H_Num,
          H_Den);

   procedure Prove_Liquidation_Warning_Cross_Multiply_Definition
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price;
      L_Num           : Ratio_Component;
      L_Den           : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement)
       and Nonnegative (L_Num)
       and Positive (L_Den),
     Post =>
       Below_Liquidation_Threshold
         (Collateral_Sats, Target_Cents, Settlement, L_Num, L_Den)
       =
       (Collateral_Sats * Settlement * L_Den
        < Target_Scaled (Target_Cents) * L_Num);

   procedure Prove_Full_Collateral_Terminal_Only_When_Insolvent
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and Nonnegative (Target_Cents)
       and Positive (Settlement),
     Post =>
       Full_Collateral_Terminal_Allowed
         (Collateral_Sats, Target_Cents, Settlement)
       =
       Insolvent (Collateral_Sats, Target_Cents, Settlement);

   procedure Prove_Par_Solvent_Blocks_Full_Collateral_Terminal
     (Collateral_Sats : Amount;
      Target_Cents    : Amount;
      Settlement      : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Target_Cents)
       and then Positive (Settlement)
       and then Par_Solvent (Collateral_Sats, Target_Cents, Settlement),
     Post =>
       not Full_Collateral_Terminal_Allowed
         (Collateral_Sats, Target_Cents, Settlement);
end Synthetic_Dollar_Stable_Exposure_Algebra;
