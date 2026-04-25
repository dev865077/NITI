pragma SPARK_Mode (On);

package body Covered_Call_Yield_Note_Algebra is
   procedure Prove_Branch_Coverage
     (Settlement : Price;
      Strike     : Price) is
   begin
      if Settlement <= Strike then
         pragma Assert (OTM (Settlement, Strike));
         pragma Assert (not ITM (Settlement, Strike));
      else
         pragma Assert (ITM (Settlement, Strike));
         pragma Assert (not OTM (Settlement, Strike));
      end if;
   end Prove_Branch_Coverage;

   procedure Prove_Deliverable_Capped
     (Covered_Notional : Amount;
      Cap              : Amount;
      Collateral       : Amount) is
      D : constant Amount :=
        Deliverable_Notional (Covered_Notional, Cap, Collateral);
   begin
      if Covered_Notional <= Cap then
         pragma Assert (Min (Covered_Notional, Cap) = Covered_Notional);
         if Covered_Notional <= Collateral then
            pragma Assert (D = Covered_Notional);
         else
            pragma Assert (D = Collateral);
         end if;
      else
         pragma Assert (Min (Covered_Notional, Cap) = Cap);
         if Cap <= Collateral then
            pragma Assert (D = Cap);
         else
            pragma Assert (D = Collateral);
         end if;
      end if;
   end Prove_Deliverable_Capped;

   procedure Prove_OTM_Claim_Zero
     (Settlement : Price;
      Strike     : Price) is
   begin
      pragma Assert (Settlement <= Strike);
      pragma Assert (Buyer_Output (0) = 0);
   end Prove_OTM_Claim_Zero;

   procedure Prove_ATM_Is_OTM_And_Claim_Zero
     (Settlement : Price) is
   begin
      pragma Assert (Settlement <= Settlement);
      pragma Assert (not (Settlement > Settlement));
      pragma Assert (OTM (Settlement, Settlement));
      pragma Assert (not ITM (Settlement, Settlement));
      pragma Assert (Buyer_Output (0) = 0);
   end Prove_ATM_Is_OTM_And_Claim_Zero;

   procedure Prove_ITM_Quotient_Bounds
     (Settlement  : Price;
      Strike      : Price;
      Deliverable : Amount;
      Claim       : Amount;
      Remainder   : Amount) is
      Intrinsic : constant Amount :=
        ITM_Intrinsic_Scaled (Settlement, Strike, Deliverable);
   begin
      pragma Assert (Claim * Settlement + Remainder = Intrinsic);
      pragma Assert (Remainder >= 0);
      pragma Assert (Claim * Settlement <= Intrinsic);
      pragma Assert (Remainder < Settlement);
      pragma Assert (Claim * Settlement + Remainder < Claim * Settlement + Settlement);
      pragma Assert (Intrinsic < (Claim + 1) * Settlement);
   end Prove_ITM_Quotient_Bounds;

   procedure Prove_ITM_Claim_Bounded_By_Deliverable
     (Settlement  : Price;
      Strike      : Price;
      Deliverable : Amount;
      Claim       : Amount;
      Remainder   : Amount) is
      Intrinsic : constant Amount :=
        ITM_Intrinsic_Scaled (Settlement, Strike, Deliverable);
      Gap : constant Amount := Settlement - Strike;
   begin
      pragma Assert (Gap >= 0);
      pragma Assert (Gap <= Settlement);
      pragma Assert (Intrinsic = Gap * Deliverable);
      pragma Assert (Claim * Settlement + Remainder = Intrinsic);
      pragma Assert (Claim * Settlement <= Intrinsic);
      pragma Assert (Intrinsic <= Settlement * Deliverable);
      pragma Assert (Claim * Settlement <= Settlement * Deliverable);
      pragma Assert (Settlement > 0);
      pragma Assert (Claim <= Deliverable);
   end Prove_ITM_Claim_Bounded_By_Deliverable;

   procedure Prove_Escrowed_Conservation
     (Collateral : Amount;
      Claim      : Amount;
      Premium    : Amount) is
      Writer : constant Amount :=
        Writer_Output_Escrowed (Collateral, Claim, Premium);
   begin
      pragma Assert (Writer = Collateral - Claim + Premium);
      pragma Assert (Collateral - Claim >= 0);
      pragma Assert (Writer >= Premium);
      pragma Assert
        (Buyer_Output (Claim) + Writer
         = Claim + (Collateral - Claim + Premium));
      pragma Assert
        (Buyer_Output (Claim) + Writer = Collateral + Premium);
   end Prove_Escrowed_Conservation;

   procedure Prove_Upfront_Conservation
     (Collateral : Amount;
      Claim      : Amount) is
      Writer : constant Amount :=
        Writer_Output_Upfront (Collateral, Claim);
   begin
      pragma Assert (Writer = Collateral - Claim);
      pragma Assert
        (Buyer_Output (Claim) + Writer
         = Claim + (Collateral - Claim));
      pragma Assert
        (Buyer_Output (Claim) + Writer = Collateral);
   end Prove_Upfront_Conservation;

   procedure Prove_Test_Vector_OTM is
   begin
      Prove_OTM_Claim_Zero (90, 100);
   end Prove_Test_Vector_OTM;

   procedure Prove_Test_Vector_ATM is
   begin
      Prove_ATM_Is_OTM_And_Claim_Zero (100);
   end Prove_Test_Vector_ATM;

   procedure Prove_Test_Vector_ITM is
   begin
      Prove_ITM_Quotient_Bounds (150, 100, 90, 30, 0);
      Prove_ITM_Claim_Bounded_By_Deliverable (150, 100, 90, 30, 0);
      Prove_Escrowed_Conservation (100, 30, 5);
   end Prove_Test_Vector_ITM;

   procedure Prove_Test_Vector_Capped_Claim is
   begin
      Prove_Deliverable_Capped (100, 40, 90);
      Prove_ITM_Quotient_Bounds (150, 100, 40, 13, 50);
      Prove_ITM_Claim_Bounded_By_Deliverable (150, 100, 40, 13, 50);
      Prove_Escrowed_Conservation (90, 13, 7);
   end Prove_Test_Vector_Capped_Claim;

   procedure Prove_Test_Vector_Maximum_Delivery is
   begin
      Prove_Deliverable_Capped (100, 100, 100);
      Prove_ITM_Quotient_Bounds (100, 0, 100, 100, 0);
      Prove_ITM_Claim_Bounded_By_Deliverable (100, 0, 100, 100, 0);
      Prove_Escrowed_Conservation (100, 100, 1);
   end Prove_Test_Vector_Maximum_Delivery;
end Covered_Call_Yield_Note_Algebra;
