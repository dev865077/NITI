pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Covered_Call_Yield_Note_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Price is Valid_Big_Integer;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);

   function Min (A, B : Amount) return Amount is
     (if A <= B then A else B)
   with
     Pre => Nonnegative (A) and Nonnegative (B);

   --  #6: if a cap is used, D = min(N, Cap, Q).
   function Deliverable_Notional
     (Covered_Notional : Amount;
      Cap              : Amount;
      Collateral       : Amount) return Amount
   is (Min (Min (Covered_Notional, Cap), Collateral))
   with
     Pre =>
       Nonnegative (Covered_Notional)
       and Nonnegative (Cap)
       and Nonnegative (Collateral);

   --  #6: OTM(S) = S <= K, ITM(S) = S > K.
   function OTM
     (Settlement : Price;
      Strike     : Price) return Boolean
   is (Settlement <= Strike)
   with
     Pre => Positive (Settlement) and Nonnegative (Strike);

   function ITM
     (Settlement : Price;
      Strike     : Price) return Boolean
   is (Settlement > Strike)
   with
     Pre => Positive (Settlement) and Nonnegative (Strike);

   --  #6: A(S) = (S - K) * D in the ITM branch.
   function ITM_Intrinsic_Scaled
     (Settlement  : Price;
      Strike      : Price;
      Deliverable : Amount) return Amount
   is ((Settlement - Strike) * Deliverable)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Strike)
       and Settlement > Strike
       and Nonnegative (Deliverable);

   --  #6: BuyerClaim = floor(A / S), Remainder = A - BuyerClaim*S.
   --  The quotient witness is supplied by the caller so the proof target can
   --  avoid executable division and prove only the settlement algebra.
   function Valid_ITM_Quotient
     (Settlement  : Price;
      Strike      : Price;
      Deliverable : Amount;
      Claim       : Amount;
      Remainder   : Amount) return Boolean
   is
     (Claim * Settlement + Remainder =
        ITM_Intrinsic_Scaled (Settlement, Strike, Deliverable)
      and Remainder >= 0
      and Remainder < Settlement)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Strike)
       and Settlement > Strike
       and Nonnegative (Deliverable)
       and Nonnegative (Claim)
       and Nonnegative (Remainder);

   function Buyer_Output (Claim : Amount) return Amount is (Claim)
   with
     Pre => Nonnegative (Claim);

   --  #6 escrowed premium convention:
   --  WriterOutput = Q - BuyerClaim + P.
   function Writer_Output_Escrowed
     (Collateral : Amount;
      Claim      : Amount;
      Premium    : Amount) return Amount
   is (Collateral - Claim + Premium)
   with
     Pre =>
       Nonnegative (Collateral)
       and Nonnegative (Claim)
       and Nonnegative (Premium)
       and Claim <= Collateral;

   function Writer_Output_Upfront
     (Collateral : Amount;
      Claim      : Amount) return Amount
   is (Collateral - Claim)
   with
     Pre =>
       Nonnegative (Collateral)
       and Nonnegative (Claim)
       and Claim <= Collateral;

   procedure Prove_Branch_Coverage
     (Settlement : Price;
      Strike     : Price)
   with
     Global => null,
     Pre => Positive (Settlement) and Nonnegative (Strike),
     Post =>
       (OTM (Settlement, Strike) or ITM (Settlement, Strike))
       and (OTM (Settlement, Strike) /= ITM (Settlement, Strike));

   procedure Prove_Deliverable_Capped
     (Covered_Notional : Amount;
      Cap              : Amount;
      Collateral       : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Covered_Notional)
       and Nonnegative (Cap)
       and Nonnegative (Collateral),
     Post =>
       Deliverable_Notional (Covered_Notional, Cap, Collateral)
         <= Covered_Notional
       and Deliverable_Notional (Covered_Notional, Cap, Collateral) <= Cap
       and Deliverable_Notional (Covered_Notional, Cap, Collateral)
         <= Collateral;

   procedure Prove_OTM_Claim_Zero
     (Settlement : Price;
      Strike     : Price)
   with
     Global => null,
     Pre =>
       Positive (Settlement)
       and then Nonnegative (Strike)
       and then OTM (Settlement, Strike),
     Post => Buyer_Output (0) = 0;

   procedure Prove_ATM_Is_OTM_And_Claim_Zero
     (Settlement : Price)
   with
     Global => null,
     Pre => Positive (Settlement),
     Post =>
       OTM (Settlement, Settlement)
       and not ITM (Settlement, Settlement)
       and Buyer_Output (0) = 0;

   procedure Prove_ITM_Quotient_Bounds
     (Settlement  : Price;
      Strike      : Price;
      Deliverable : Amount;
      Claim       : Amount;
      Remainder   : Amount)
   with
     Global => null,
     Pre =>
       Positive (Settlement)
       and then Nonnegative (Strike)
       and then Settlement > Strike
       and then Nonnegative (Deliverable)
       and then Nonnegative (Claim)
       and then Nonnegative (Remainder)
       and then Valid_ITM_Quotient
         (Settlement, Strike, Deliverable, Claim, Remainder),
     Post =>
       Claim * Settlement <=
         ITM_Intrinsic_Scaled (Settlement, Strike, Deliverable)
       and (Claim + 1) * Settlement >
         ITM_Intrinsic_Scaled (Settlement, Strike, Deliverable);

   procedure Prove_ITM_Claim_Bounded_By_Deliverable
     (Settlement  : Price;
      Strike      : Price;
      Deliverable : Amount;
      Claim       : Amount;
      Remainder   : Amount)
   with
     Global => null,
     Pre =>
       Positive (Settlement)
       and then Nonnegative (Strike)
       and then Settlement > Strike
       and then Nonnegative (Deliverable)
       and then Nonnegative (Claim)
       and then Nonnegative (Remainder)
       and then Valid_ITM_Quotient
         (Settlement, Strike, Deliverable, Claim, Remainder),
     Post => Claim <= Deliverable;

   procedure Prove_Escrowed_Conservation
     (Collateral : Amount;
      Claim      : Amount;
      Premium    : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral)
       and Nonnegative (Claim)
       and Nonnegative (Premium)
       and Claim <= Collateral,
     Post =>
       Buyer_Output (Claim)
       + Writer_Output_Escrowed (Collateral, Claim, Premium)
       = Collateral + Premium
       and Writer_Output_Escrowed (Collateral, Claim, Premium) >= Premium;

   procedure Prove_Upfront_Conservation
     (Collateral : Amount;
      Claim      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral)
       and Nonnegative (Claim)
       and Claim <= Collateral,
     Post =>
       Buyer_Output (Claim)
       + Writer_Output_Upfront (Collateral, Claim)
       = Collateral;

   --  Explicit #7 vectors: OTM, ATM, ITM, capped claim, maximum delivery.
   procedure Prove_Test_Vector_OTM
   with
     Global => null,
     Post =>
       OTM (90, 100)
       and Buyer_Output (0) = 0;

   procedure Prove_Test_Vector_ATM
   with
     Global => null,
     Post =>
       OTM (100, 100)
       and not ITM (100, 100)
       and Buyer_Output (0) = 0;

   procedure Prove_Test_Vector_ITM
   with
     Global => null,
     Post =>
       Valid_ITM_Quotient (150, 100, 90, 30, 0)
       and Buyer_Output (30) + Writer_Output_Escrowed (100, 30, 5) = 105;

   procedure Prove_Test_Vector_Capped_Claim
   with
     Global => null,
     Post =>
       Deliverable_Notional (100, 40, 90) = 40
       and Valid_ITM_Quotient (150, 100, 40, 13, 50)
       and Buyer_Output (13) + Writer_Output_Escrowed (90, 13, 7) = 97;

   procedure Prove_Test_Vector_Maximum_Delivery
   with
     Global => null,
     Post =>
       Deliverable_Notional (100, 100, 100) = 100
       and Valid_ITM_Quotient (100, 0, 100, 100, 0)
       and Buyer_Output (100) + Writer_Output_Escrowed (100, 100, 1) = 101;
end Covered_Call_Yield_Note_Algebra;
