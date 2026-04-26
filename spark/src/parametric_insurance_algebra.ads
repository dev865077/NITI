pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Parametric_Insurance_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Price is Valid_Big_Integer;
   subtype Event_Value is Valid_Big_Integer;

   SAT : constant Amount := 100_000_000;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);

   function Min (A, B : Amount) return Amount is
     (if A <= B then A else B)
   with
     Pre => Nonnegative (A) and Nonnegative (B);

   --  #28: TriggeredUp(E, T) = E >= T, NoTriggerUp(E, T) = E < T.
   function Triggered_Up (E, T : Event_Value) return Boolean is (E >= T);
   function No_Trigger_Up (E, T : Event_Value) return Boolean is (E < T);

   --  #28: TriggeredDown(E, T) = E <= T, NoTriggerDown(E, T) = E > T.
   function Triggered_Down (E, T : Event_Value) return Boolean is (E <= T);
   function No_Trigger_Down (E, T : Event_Value) return Boolean is (E > T);

   --  #28 binary payout: RawPayout = Limit when triggered, otherwise 0.
   function Binary_Raw_Payout_Up
     (E     : Event_Value;
      T     : Event_Value;
      Limit : Amount) return Amount
   is
     (if Triggered_Up (E, T) then Limit else 0)
   with
     Pre => Nonnegative (Limit);

   function Binary_Raw_Payout_Down
     (E     : Event_Value;
      T     : Event_Value;
      Limit : Amount) return Amount
   is
     (if Triggered_Down (E, T) then Limit else 0)
   with
     Pre => Nonnegative (Limit);

   --  #28: BuyerPayout = min(Q, RawPayout).
   function Buyer_Payout
     (Collateral : Amount;
      Raw_Payout : Amount) return Amount
   is (Min (Collateral, Raw_Payout))
   with
     Pre => Nonnegative (Collateral) and Nonnegative (Raw_Payout);

   --  #28: SellerResidual = Q - BuyerPayout.
   function Seller_Residual
     (Collateral   : Amount;
      Buyer_Claim  : Amount) return Amount
   is (Collateral - Buyer_Claim)
   with
     Pre =>
       Nonnegative (Collateral)
       and Nonnegative (Buyer_Claim)
       and Buyer_Claim <= Collateral;

   function Seller_Residual_From_Raw
     (Collateral : Amount;
      Raw_Payout : Amount) return Amount
   is
     (Seller_Residual
        (Collateral, Buyer_Payout (Collateral, Raw_Payout)))
   with
     Pre => Nonnegative (Collateral) and Nonnegative (Raw_Payout);

   function Seller_Output_Escrowed
     (Collateral  : Amount;
      Buyer_Claim : Amount;
      Premium     : Amount) return Amount
   is (Collateral - Buyer_Claim + Premium)
   with
     Pre =>
       Nonnegative (Collateral)
       and Nonnegative (Buyer_Claim)
       and Nonnegative (Premium)
       and Buyer_Claim <= Collateral;

   function Tier0
     (E  : Event_Value;
      T1 : Event_Value;
      T2 : Event_Value) return Boolean
   is (E < T1)
   with
     Pre => T1 < T2;

   function Tier1
     (E  : Event_Value;
      T1 : Event_Value;
      T2 : Event_Value) return Boolean
   is (E >= T1 and E < T2)
   with
     Pre => T1 < T2;

   function Tier2
     (E  : Event_Value;
      T1 : Event_Value;
      T2 : Event_Value) return Boolean
   is (E >= T2)
   with
     Pre => T1 < T2;

   --  #28 three-region tiered payout: 0, Partial, Limit.
   function Tier3_Raw_Payout
     (E       : Event_Value;
      T1      : Event_Value;
      T2      : Event_Value;
      Partial : Amount;
      Limit   : Amount) return Amount
   is
     (if E < T1 then 0
      elsif E < T2 then Partial
      else Limit)
   with
     Pre =>
       T1 < T2
       and Nonnegative (Partial)
       and Nonnegative (Limit)
       and Partial <= Limit;

   function Linear_Range
     (Attach  : Event_Value;
      Exhaust : Event_Value) return Amount
   is (Exhaust - Attach)
   with
     Pre => Attach < Exhaust;

   function Linear_Numerator
     (E      : Event_Value;
      Attach : Event_Value;
      Limit  : Amount) return Amount
   is (Limit * (E - Attach))
   with
     Pre => Attach < E and Nonnegative (Limit);

   --  #28: PartialPayout and Remainder witness floor(PartialNum / Range).
   function Valid_Linear_Partial
     (E          : Event_Value;
      Attach     : Event_Value;
      Exhaust    : Event_Value;
      Limit      : Amount;
      Payout     : Amount;
      Remainder  : Amount) return Boolean
   is
     (Payout * Linear_Range (Attach, Exhaust) + Remainder
      = Linear_Numerator (E, Attach, Limit)
      and Remainder >= 0
      and Remainder < Linear_Range (Attach, Exhaust))
   with
     Pre =>
       Attach < E
       and E < Exhaust
       and Nonnegative (Limit)
       and Nonnegative (Payout)
       and Nonnegative (Remainder);

   --  #28: NeedBTC is a ceil witness for D * SAT / P.
   function Valid_Need_BTC
     (Claim_USD_Cents : Amount;
      Settlement      : Price;
      Need_BTC        : Amount) return Boolean
   is
     (Need_BTC * Settlement >= Claim_USD_Cents * SAT
      and
        (Need_BTC = 0
         or else (Need_BTC - 1) * Settlement < Claim_USD_Cents * SAT))
   with
     Pre =>
       Nonnegative (Claim_USD_Cents)
       and Positive (Settlement)
       and Nonnegative (Need_BTC);

   function USD_Indexed_Buyer_Payout
     (Collateral : Amount;
      Need_BTC   : Amount) return Amount
   is (Buyer_Payout (Collateral, Need_BTC))
   with
     Pre => Nonnegative (Collateral) and Nonnegative (Need_BTC);

   function Investor_Redemption
     (Principal : Amount;
      Loss      : Amount) return Amount
   is (Principal - Loss)
   with
     Pre =>
       Nonnegative (Principal)
       and Nonnegative (Loss)
       and Loss <= Principal;

   function Investor_Output_Escrowed
     (Principal : Amount;
      Loss      : Amount;
      Coupon    : Amount) return Amount
   is (Principal - Loss + Coupon)
   with
     Pre =>
       Nonnegative (Principal)
       and Nonnegative (Loss)
       and Nonnegative (Coupon)
       and Loss <= Principal;

   function Renewal_Collateral
     (Collateral : Amount;
      Loss       : Amount) return Amount
   is (Collateral - Loss)
   with
     Pre =>
       Nonnegative (Collateral)
       and Nonnegative (Loss)
       and Loss <= Collateral;

   --  #28: Paid_{i+1} = min(AggLimit, Paid_i + Claim_i).
   function Aggregate_Paid_Next
     (Agg_Limit : Amount;
      Paid      : Amount;
      Claim     : Amount) return Amount
   is (Min (Agg_Limit, Paid + Claim))
   with
     Pre =>
       Nonnegative (Agg_Limit)
       and Nonnegative (Paid)
       and Nonnegative (Claim)
       and Paid <= Agg_Limit;

   function Aggregate_Available_Next
     (Agg_Limit : Amount;
      Paid      : Amount;
      Claim     : Amount) return Amount
   is (Agg_Limit - Aggregate_Paid_Next (Agg_Limit, Paid, Claim))
   with
     Pre =>
       Nonnegative (Agg_Limit)
       and Nonnegative (Paid)
       and Nonnegative (Claim)
       and Paid <= Agg_Limit;

   procedure Prove_Up_Trigger_Branches
     (E : Event_Value;
      T : Event_Value)
   with
     Global => null,
     Post =>
       (Triggered_Up (E, T) or No_Trigger_Up (E, T))
       and (Triggered_Up (E, T) /= No_Trigger_Up (E, T));

   procedure Prove_Down_Trigger_Branches
     (E : Event_Value;
      T : Event_Value)
   with
     Global => null,
     Post =>
       (Triggered_Down (E, T) or No_Trigger_Down (E, T))
       and (Triggered_Down (E, T) /= No_Trigger_Down (E, T));

   procedure Prove_Binary_Up_No_Trigger_Payout_Zero
     (E          : Event_Value;
      T          : Event_Value;
      Collateral : Amount;
      Limit      : Amount)
   with
     Global => null,
     Pre =>
       No_Trigger_Up (E, T)
       and Nonnegative (Collateral)
       and Nonnegative (Limit),
     Post =>
       Buyer_Payout
         (Collateral, Binary_Raw_Payout_Up (E, T, Limit)) = 0
       and Seller_Residual_From_Raw
         (Collateral, Binary_Raw_Payout_Up (E, T, Limit)) = Collateral;

   procedure Prove_Binary_Down_No_Trigger_Payout_Zero
     (E          : Event_Value;
      T          : Event_Value;
      Collateral : Amount;
      Limit      : Amount)
   with
     Global => null,
     Pre =>
       No_Trigger_Down (E, T)
       and Nonnegative (Collateral)
       and Nonnegative (Limit),
     Post =>
       Buyer_Payout
         (Collateral, Binary_Raw_Payout_Down (E, T, Limit)) = 0
       and Seller_Residual_From_Raw
         (Collateral, Binary_Raw_Payout_Down (E, T, Limit)) = Collateral;

   procedure Prove_Binary_Payout_Bounded
     (Collateral : Amount;
      Raw_Payout : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral) and Nonnegative (Raw_Payout),
     Post =>
       Buyer_Payout (Collateral, Raw_Payout) >= 0
       and Buyer_Payout (Collateral, Raw_Payout) <= Collateral;

   procedure Prove_Binary_BTC_Conservation
     (Collateral : Amount;
      Raw_Payout : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral) and Nonnegative (Raw_Payout),
     Post =>
       Buyer_Payout (Collateral, Raw_Payout)
       + Seller_Residual_From_Raw (Collateral, Raw_Payout)
       = Collateral;

   procedure Prove_Max_Loss_Pays_Limit_When_Solvent
     (Collateral : Amount;
      Limit      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral)
       and Nonnegative (Limit)
       and Limit <= Collateral,
     Post =>
       Buyer_Payout (Collateral, Limit) = Limit
       and Seller_Residual_From_Raw (Collateral, Limit)
         = Collateral - Limit;

   procedure Prove_Max_Loss_Exhausts_Collateral_When_Undercollateralized
     (Collateral : Amount;
      Limit      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral)
       and Nonnegative (Limit)
       and Limit > Collateral,
     Post =>
       Buyer_Payout (Collateral, Limit) = Collateral
       and Seller_Residual_From_Raw (Collateral, Limit) = 0;

   procedure Prove_Tier3_Branch_Coverage_Disjointness
     (E  : Event_Value;
      T1 : Event_Value;
      T2 : Event_Value)
   with
     Global => null,
     Pre => T1 < T2,
     Post =>
       (Tier0 (E, T1, T2) or Tier1 (E, T1, T2) or Tier2 (E, T1, T2))
       and not (Tier0 (E, T1, T2) and Tier1 (E, T1, T2))
       and not (Tier0 (E, T1, T2) and Tier2 (E, T1, T2))
       and not (Tier1 (E, T1, T2) and Tier2 (E, T1, T2));

   procedure Prove_Tier3_Payout_Bounded
     (E          : Event_Value;
      T1         : Event_Value;
      T2         : Event_Value;
      Partial    : Amount;
      Limit      : Amount;
      Collateral : Amount)
   with
     Global => null,
     Pre =>
       T1 < T2
       and Nonnegative (Partial)
       and Nonnegative (Limit)
       and Nonnegative (Collateral)
       and Partial <= Limit,
     Post =>
       Tier3_Raw_Payout (E, T1, T2, Partial, Limit) >= 0
       and Tier3_Raw_Payout (E, T1, T2, Partial, Limit) <= Limit
       and Buyer_Payout
         (Collateral, Tier3_Raw_Payout (E, T1, T2, Partial, Limit)) >= 0
       and Buyer_Payout
         (Collateral, Tier3_Raw_Payout (E, T1, T2, Partial, Limit))
         <= Collateral;

   procedure Prove_Tier3_BTC_Conservation
     (E          : Event_Value;
      T1         : Event_Value;
      T2         : Event_Value;
      Partial    : Amount;
      Limit      : Amount;
      Collateral : Amount)
   with
     Global => null,
     Pre =>
       T1 < T2
       and Nonnegative (Partial)
       and Nonnegative (Limit)
       and Nonnegative (Collateral)
       and Partial <= Limit,
     Post =>
       Buyer_Payout
         (Collateral, Tier3_Raw_Payout (E, T1, T2, Partial, Limit))
       + Seller_Residual_From_Raw
         (Collateral, Tier3_Raw_Payout (E, T1, T2, Partial, Limit))
       = Collateral;

   procedure Prove_Linear_Partial_Payout_Bounded
     (E          : Event_Value;
      Attach     : Event_Value;
      Exhaust    : Event_Value;
      Limit      : Amount;
      Payout     : Amount;
      Remainder  : Amount)
   with
     Global => null,
     Pre =>
       Attach < E
       and then E < Exhaust
       and then Nonnegative (Limit)
       and then Nonnegative (Payout)
       and then Nonnegative (Remainder)
       and then Valid_Linear_Partial
         (E, Attach, Exhaust, Limit, Payout, Remainder),
     Post => Payout >= 0 and Payout <= Limit;

   procedure Prove_Need_BTC_Ceil_Bounds
     (Claim_USD_Cents : Amount;
      Settlement      : Price;
      Need_BTC        : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Claim_USD_Cents)
       and then Positive (Settlement)
       and then Nonnegative (Need_BTC)
       and then Valid_Need_BTC
         (Claim_USD_Cents, Settlement, Need_BTC),
     Post =>
       Need_BTC * Settlement >= Claim_USD_Cents * SAT
       and
         (Need_BTC = 0
          or else (Need_BTC - 1) * Settlement < Claim_USD_Cents * SAT);

   procedure Prove_USD_Indexed_Solvent_Covers_Target
     (Collateral       : Amount;
      Claim_USD_Cents  : Amount;
      Settlement       : Price;
      Need_BTC         : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral)
       and then Nonnegative (Claim_USD_Cents)
       and then Positive (Settlement)
       and then Nonnegative (Need_BTC)
       and then Valid_Need_BTC
         (Claim_USD_Cents, Settlement, Need_BTC)
       and then Collateral * Settlement >= Claim_USD_Cents * SAT,
     Post =>
       USD_Indexed_Buyer_Payout (Collateral, Need_BTC) * Settlement
       >= Claim_USD_Cents * SAT;

   procedure Prove_USD_Indexed_Insolvent_Exhausts_Collateral
     (Collateral       : Amount;
      Claim_USD_Cents  : Amount;
      Settlement       : Price;
      Need_BTC         : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral)
       and then Nonnegative (Claim_USD_Cents)
       and then Positive (Settlement)
       and then Nonnegative (Need_BTC)
       and then Valid_Need_BTC
         (Claim_USD_Cents, Settlement, Need_BTC)
       and then Collateral * Settlement < Claim_USD_Cents * SAT,
     Post =>
       USD_Indexed_Buyer_Payout (Collateral, Need_BTC) = Collateral
       and Seller_Residual
         (Collateral, USD_Indexed_Buyer_Payout (Collateral, Need_BTC)) = 0;

   procedure Prove_Investor_Redemption_Bounded
     (Principal : Amount;
      Loss      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Principal)
       and Nonnegative (Loss)
       and Loss <= Principal,
     Post =>
       Investor_Redemption (Principal, Loss) >= 0
       and Investor_Redemption (Principal, Loss) <= Principal;

   procedure Prove_Upfront_Note_Waterfall_Conserves
     (Principal : Amount;
      Loss      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Principal)
       and Nonnegative (Loss)
       and Loss <= Principal,
     Post =>
       Loss + Investor_Redemption (Principal, Loss) = Principal;

   procedure Prove_Escrowed_Coupon_Waterfall_Conserves
     (Principal : Amount;
      Loss      : Amount;
      Coupon    : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Principal)
       and Nonnegative (Loss)
       and Nonnegative (Coupon)
       and Loss <= Principal,
     Post =>
       Loss + Investor_Output_Escrowed (Principal, Loss, Coupon)
       = Principal + Coupon;

   procedure Prove_Escrowed_Premium_Conservation
     (Collateral  : Amount;
      Buyer_Claim : Amount;
      Premium     : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral)
       and Nonnegative (Buyer_Claim)
       and Nonnegative (Premium)
       and Buyer_Claim <= Collateral,
     Post =>
       Buyer_Claim
       + Seller_Output_Escrowed (Collateral, Buyer_Claim, Premium)
       = Collateral + Premium;

   procedure Prove_No_Loss_Renewal_Preserves_Collateral
     (Collateral : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral),
     Post => Renewal_Collateral (Collateral, 0) = Collateral;

   procedure Prove_Loss_Renewal_Preserves_Residual
     (Collateral : Amount;
      Loss       : Amount;
      Next_Limit : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral)
       and then Nonnegative (Loss)
       and then Nonnegative (Next_Limit)
       and then Loss <= Collateral
       and then Next_Limit <= Renewal_Collateral (Collateral, Loss),
     Post =>
       Renewal_Collateral (Collateral, Loss) >= 0
       and Next_Limit <= Renewal_Collateral (Collateral, Loss);

   procedure Prove_Aggregate_Paid_Monotone_And_Capped
     (Agg_Limit : Amount;
      Paid      : Amount;
      Claim     : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Agg_Limit)
       and Nonnegative (Paid)
       and Nonnegative (Claim)
       and Paid <= Agg_Limit,
     Post =>
       Paid <= Aggregate_Paid_Next (Agg_Limit, Paid, Claim)
       and Aggregate_Paid_Next (Agg_Limit, Paid, Claim) <= Agg_Limit;

   procedure Prove_Aggregate_Available_Nonnegative
     (Agg_Limit : Amount;
      Paid      : Amount;
      Claim     : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Agg_Limit)
       and Nonnegative (Paid)
       and Nonnegative (Claim)
       and Paid <= Agg_Limit,
     Post => Aggregate_Available_Next (Agg_Limit, Paid, Claim) >= 0;
end Parametric_Insurance_Algebra;
