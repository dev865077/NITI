pragma SPARK_Mode (On);

package body Parametric_Insurance_Algebra is
   procedure Prove_Up_Trigger_Branches
     (E : Event_Value;
      T : Event_Value) is
   begin
      if E >= T then
         pragma Assert (Triggered_Up (E, T));
         pragma Assert (not No_Trigger_Up (E, T));
      else
         pragma Assert (not Triggered_Up (E, T));
         pragma Assert (No_Trigger_Up (E, T));
      end if;
   end Prove_Up_Trigger_Branches;

   procedure Prove_Down_Trigger_Branches
     (E : Event_Value;
      T : Event_Value) is
   begin
      if E <= T then
         pragma Assert (Triggered_Down (E, T));
         pragma Assert (not No_Trigger_Down (E, T));
      else
         pragma Assert (not Triggered_Down (E, T));
         pragma Assert (No_Trigger_Down (E, T));
      end if;
   end Prove_Down_Trigger_Branches;

   procedure Prove_Binary_Up_No_Trigger_Payout_Zero
     (E          : Event_Value;
      T          : Event_Value;
      Collateral : Amount;
      Limit      : Amount) is
      Raw : constant Amount := Binary_Raw_Payout_Up (E, T, Limit);
   begin
      pragma Assert (Raw = 0);
      pragma Assert (Buyer_Payout (Collateral, Raw) = 0);
      pragma Assert (Seller_Residual_From_Raw (Collateral, Raw)
                     = Collateral);
   end Prove_Binary_Up_No_Trigger_Payout_Zero;

   procedure Prove_Binary_Down_No_Trigger_Payout_Zero
     (E          : Event_Value;
      T          : Event_Value;
      Collateral : Amount;
      Limit      : Amount) is
      Raw : constant Amount := Binary_Raw_Payout_Down (E, T, Limit);
   begin
      pragma Assert (Raw = 0);
      pragma Assert (Buyer_Payout (Collateral, Raw) = 0);
      pragma Assert (Seller_Residual_From_Raw (Collateral, Raw)
                     = Collateral);
   end Prove_Binary_Down_No_Trigger_Payout_Zero;

   procedure Prove_Binary_Payout_Bounded
     (Collateral : Amount;
      Raw_Payout : Amount) is
   begin
      if Collateral <= Raw_Payout then
         pragma Assert (Buyer_Payout (Collateral, Raw_Payout)
                        = Collateral);
      else
         pragma Assert (Buyer_Payout (Collateral, Raw_Payout)
                        = Raw_Payout);
      end if;
      pragma Assert (Buyer_Payout (Collateral, Raw_Payout) >= 0);
      pragma Assert
        (Buyer_Payout (Collateral, Raw_Payout) <= Collateral);
   end Prove_Binary_Payout_Bounded;

   procedure Prove_Binary_BTC_Conservation
     (Collateral : Amount;
      Raw_Payout : Amount) is
      Buyer : constant Amount := Buyer_Payout (Collateral, Raw_Payout);
      Seller : constant Amount :=
        Seller_Residual_From_Raw (Collateral, Raw_Payout);
   begin
      if Collateral <= Raw_Payout then
         pragma Assert (Buyer = Collateral);
         pragma Assert (Seller = 0);
      else
         pragma Assert (Buyer = Raw_Payout);
         pragma Assert (Seller = Collateral - Raw_Payout);
      end if;
      pragma Assert (Buyer + Seller = Collateral);
   end Prove_Binary_BTC_Conservation;

   procedure Prove_Max_Loss_Pays_Limit_When_Solvent
     (Collateral : Amount;
      Limit      : Amount) is
   begin
      pragma Assert (Buyer_Payout (Collateral, Limit) = Limit);
      pragma Assert
        (Seller_Residual_From_Raw (Collateral, Limit)
         = Collateral - Limit);
   end Prove_Max_Loss_Pays_Limit_When_Solvent;

   procedure Prove_Max_Loss_Exhausts_Collateral_When_Undercollateralized
     (Collateral : Amount;
      Limit      : Amount) is
   begin
      pragma Assert (Buyer_Payout (Collateral, Limit) = Collateral);
      pragma Assert (Seller_Residual_From_Raw (Collateral, Limit) = 0);
   end Prove_Max_Loss_Exhausts_Collateral_When_Undercollateralized;

   procedure Prove_Tier3_Branch_Coverage_Disjointness
     (E  : Event_Value;
      T1 : Event_Value;
      T2 : Event_Value) is
   begin
      if E < T1 then
         pragma Assert (Tier0 (E, T1, T2));
         pragma Assert (not Tier1 (E, T1, T2));
         pragma Assert (not Tier2 (E, T1, T2));
      elsif E < T2 then
         pragma Assert (not Tier0 (E, T1, T2));
         pragma Assert (Tier1 (E, T1, T2));
         pragma Assert (not Tier2 (E, T1, T2));
      else
         pragma Assert (not Tier0 (E, T1, T2));
         pragma Assert (not Tier1 (E, T1, T2));
         pragma Assert (Tier2 (E, T1, T2));
      end if;
   end Prove_Tier3_Branch_Coverage_Disjointness;

   procedure Prove_Tier3_Payout_Bounded
     (E          : Event_Value;
      T1         : Event_Value;
      T2         : Event_Value;
      Partial    : Amount;
      Limit      : Amount;
      Collateral : Amount) is
      Raw : constant Amount :=
        Tier3_Raw_Payout (E, T1, T2, Partial, Limit);
   begin
      if E < T1 then
         pragma Assert (Raw = 0);
      elsif E < T2 then
         pragma Assert (Raw = Partial);
      else
         pragma Assert (Raw = Limit);
      end if;
      pragma Assert (Raw >= 0);
      pragma Assert (Raw <= Limit);
      pragma Assert (Buyer_Payout (Collateral, Raw) >= 0);
      pragma Assert (Buyer_Payout (Collateral, Raw) <= Collateral);
   end Prove_Tier3_Payout_Bounded;

   procedure Prove_Tier3_BTC_Conservation
     (E          : Event_Value;
      T1         : Event_Value;
      T2         : Event_Value;
      Partial    : Amount;
      Limit      : Amount;
      Collateral : Amount) is
      Raw : constant Amount :=
        Tier3_Raw_Payout (E, T1, T2, Partial, Limit);
      Buyer : constant Amount := Buyer_Payout (Collateral, Raw);
      Seller : constant Amount := Seller_Residual_From_Raw (Collateral, Raw);
   begin
      if Collateral <= Raw then
         pragma Assert (Buyer = Collateral);
         pragma Assert (Seller = 0);
      else
         pragma Assert (Buyer = Raw);
         pragma Assert (Seller = Collateral - Raw);
      end if;
      pragma Assert (Buyer + Seller = Collateral);
   end Prove_Tier3_BTC_Conservation;

   procedure Prove_Linear_Partial_Payout_Bounded
     (E          : Event_Value;
      Attach     : Event_Value;
      Exhaust    : Event_Value;
      Limit      : Amount;
      Payout     : Amount;
      Remainder  : Amount) is
      L_Range : constant Amount := Linear_Range (Attach, Exhaust);
      Num : constant Amount := Linear_Numerator (E, Attach, Limit);
   begin
      pragma Assert (L_Range > 0);
      pragma Assert (E - Attach > 0);
      pragma Assert (E - Attach < L_Range);
      pragma Assert (Num = Limit * (E - Attach));
      pragma Assert (Num <= Limit * L_Range);
      pragma Assert (Payout * L_Range + Remainder = Num);
      pragma Assert (Remainder >= 0);
      pragma Assert (Payout * L_Range <= Num);
      pragma Assert (Payout * L_Range <= Limit * L_Range);
      pragma Assert (Payout <= Limit);
   end Prove_Linear_Partial_Payout_Bounded;

   procedure Prove_Need_BTC_Ceil_Bounds
     (Claim_USD_Cents : Amount;
      Settlement      : Price;
      Need_BTC        : Amount) is
   begin
      pragma Assert (Need_BTC * Settlement >= Claim_USD_Cents * SAT);
      if Need_BTC = 0 then
         pragma Assert
           (Need_BTC = 0
            or else (Need_BTC - 1) * Settlement < Claim_USD_Cents * SAT);
      else
         pragma Assert
           ((Need_BTC - 1) * Settlement < Claim_USD_Cents * SAT);
      end if;
   end Prove_Need_BTC_Ceil_Bounds;

   procedure Prove_USD_Indexed_Solvent_Covers_Target
     (Collateral       : Amount;
      Claim_USD_Cents  : Amount;
      Settlement       : Price;
      Need_BTC         : Amount) is
      Buyer : constant Amount :=
        USD_Indexed_Buyer_Payout (Collateral, Need_BTC);
   begin
      pragma Assert (Need_BTC * Settlement >= Claim_USD_Cents * SAT);
      pragma Assert (Buyer = Min (Collateral, Need_BTC));
      pragma Assert (Buyer * Settlement >= Claim_USD_Cents * SAT);
   end Prove_USD_Indexed_Solvent_Covers_Target;

   procedure Prove_USD_Indexed_Insolvent_Exhausts_Collateral
     (Collateral       : Amount;
      Claim_USD_Cents  : Amount;
      Settlement       : Price;
      Need_BTC         : Amount) is
      Buyer : constant Amount :=
        USD_Indexed_Buyer_Payout (Collateral, Need_BTC);
   begin
      pragma Assert (Need_BTC * Settlement >= Claim_USD_Cents * SAT);
      pragma Assert (Collateral * Settlement < Claim_USD_Cents * SAT);
      pragma Assert (Need_BTC > Collateral);
      pragma Assert (Buyer = Collateral);
      pragma Assert (Seller_Residual (Collateral, Buyer) = 0);
   end Prove_USD_Indexed_Insolvent_Exhausts_Collateral;

   procedure Prove_Investor_Redemption_Bounded
     (Principal : Amount;
      Loss      : Amount) is
   begin
      pragma Assert (Investor_Redemption (Principal, Loss)
                     = Principal - Loss);
      pragma Assert (Investor_Redemption (Principal, Loss) >= 0);
      pragma Assert (Investor_Redemption (Principal, Loss) <= Principal);
   end Prove_Investor_Redemption_Bounded;

   procedure Prove_Upfront_Note_Waterfall_Conserves
     (Principal : Amount;
      Loss      : Amount) is
   begin
      pragma Assert
        (Investor_Redemption (Principal, Loss) = Principal - Loss);
      pragma Assert (Loss + Investor_Redemption (Principal, Loss)
                     = Principal);
   end Prove_Upfront_Note_Waterfall_Conserves;

   procedure Prove_Escrowed_Coupon_Waterfall_Conserves
     (Principal : Amount;
      Loss      : Amount;
      Coupon    : Amount) is
   begin
      pragma Assert
        (Investor_Output_Escrowed (Principal, Loss, Coupon)
         = Principal - Loss + Coupon);
      pragma Assert
        (Loss + Investor_Output_Escrowed (Principal, Loss, Coupon)
         = Principal + Coupon);
   end Prove_Escrowed_Coupon_Waterfall_Conserves;

   procedure Prove_Escrowed_Premium_Conservation
     (Collateral  : Amount;
      Buyer_Claim : Amount;
      Premium     : Amount) is
   begin
      pragma Assert
        (Seller_Output_Escrowed (Collateral, Buyer_Claim, Premium)
         = Collateral - Buyer_Claim + Premium);
      pragma Assert
        (Buyer_Claim
         + Seller_Output_Escrowed (Collateral, Buyer_Claim, Premium)
         = Collateral + Premium);
   end Prove_Escrowed_Premium_Conservation;

   procedure Prove_No_Loss_Renewal_Preserves_Collateral
     (Collateral : Amount) is
   begin
      pragma Assert (Renewal_Collateral (Collateral, 0) = Collateral);
   end Prove_No_Loss_Renewal_Preserves_Collateral;

   procedure Prove_Loss_Renewal_Preserves_Residual
     (Collateral : Amount;
      Loss       : Amount;
      Next_Limit : Amount) is
   begin
      pragma Assert (Renewal_Collateral (Collateral, Loss)
                     = Collateral - Loss);
      pragma Assert (Renewal_Collateral (Collateral, Loss) >= 0);
      pragma Assert (Next_Limit <= Renewal_Collateral (Collateral, Loss));
   end Prove_Loss_Renewal_Preserves_Residual;

   procedure Prove_Aggregate_Paid_Monotone_And_Capped
     (Agg_Limit : Amount;
      Paid      : Amount;
      Claim     : Amount) is
      Next : constant Amount :=
        Aggregate_Paid_Next (Agg_Limit, Paid, Claim);
   begin
      pragma Assert (Paid <= Paid + Claim);
      if Agg_Limit <= Paid + Claim then
         pragma Assert (Next = Agg_Limit);
      else
         pragma Assert (Next = Paid + Claim);
      end if;
      pragma Assert (Paid <= Next);
      pragma Assert (Next <= Agg_Limit);
   end Prove_Aggregate_Paid_Monotone_And_Capped;

   procedure Prove_Aggregate_Available_Nonnegative
     (Agg_Limit : Amount;
      Paid      : Amount;
      Claim     : Amount) is
      Next : constant Amount :=
        Aggregate_Paid_Next (Agg_Limit, Paid, Claim);
   begin
      pragma Assert (Next <= Agg_Limit);
      pragma Assert (Aggregate_Available_Next (Agg_Limit, Paid, Claim)
                     = Agg_Limit - Next);
      pragma Assert (Aggregate_Available_Next (Agg_Limit, Paid, Claim)
                     >= 0);
   end Prove_Aggregate_Available_Nonnegative;
end Parametric_Insurance_Algebra;
