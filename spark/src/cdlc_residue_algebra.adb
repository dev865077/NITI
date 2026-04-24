pragma SPARK_Mode (On);

package body Cdlc_Residue_Algebra is
   procedure Prove_Add_Commutes (A, B : Residue) is
   begin
      pragma Assert (Natural (A) + Natural (B) = Natural (B) + Natural (A));
      pragma Assert (Add (A, B) = Add (B, A));
   end Prove_Add_Commutes;

   procedure Prove_Sum3_Rotates (A, B, C : Residue) is
   begin
      pragma Assert
        (Natural (A) + Natural (B) + Natural (C) =
         Natural (A) + Natural (C) + Natural (B));
      pragma Assert (Sum3 (A, B, C) = Sum3 (A, C, B));
   end Prove_Sum3_Rotates;

   procedure Prove_Nested_Adds_Form_Sum3 (A, B, C : Residue) is
   begin
      pragma Assert
        (Natural (Add (A, B)) =
         (Natural (A) + Natural (B)) mod Modulus);
      pragma Assert
        (Natural (Add (Add (A, B), C)) =
         (((Natural (A) + Natural (B)) mod Modulus) + Natural (C))
         mod Modulus);
      pragma Assert
        (Natural (Add (Add (A, B), C)) =
         (Natural (A) + Natural (B) + Natural (C)) mod Modulus);
      pragma Assert (Add (Add (A, B), C) = Sum3 (A, B, C));

      pragma Assert
        (Natural (Add (A, C)) =
         (Natural (A) + Natural (C)) mod Modulus);
      pragma Assert
        (Natural (Add (Add (A, C), B)) =
         (((Natural (A) + Natural (C)) mod Modulus) + Natural (B))
         mod Modulus);
      pragma Assert
        (Natural (Add (Add (A, C), B)) =
         (Natural (A) + Natural (C) + Natural (B)) mod Modulus);
      pragma Assert (Add (Add (A, C), B) = Sum3 (A, C, B));
   end Prove_Nested_Adds_Form_Sum3;

   procedure Prove_Sub_Cancels_Add (A, B : Residue) is
   begin
      pragma Assert
        (Natural (Add (A, B)) =
         (Natural (A) + Natural (B)) mod Modulus);
      pragma Assert
        (Natural (Sub (Add (A, B), B)) =
         (((Natural (A) + Natural (B)) mod Modulus)
          + Modulus - Natural (B)) mod Modulus);
      pragma Assert (Sub (Add (A, B), B) = A);
   end Prove_Sub_Cancels_Add;

   procedure Prove_Oracle_Attestation
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar) is
   begin
      null;
   end Prove_Oracle_Attestation;

   procedure Prove_Adaptor_Verifies
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Challenge     : Scalar) is
      Product : constant Residue := Mul (Challenge, Signer_Secret);
   begin
      Prove_Sub_Cancels_Add (Signer_Nonce, Hidden);
      pragma Assert
        (Sub
           (Adapted_Nonce_Point
              (Point_Of (Signer_Nonce), Point_Of (Hidden)),
            Point_Of (Hidden)) = Signer_Nonce);
      pragma Assert
        (Add
           (Sub
              (Adapted_Nonce_Point
                 (Point_Of (Signer_Nonce), Point_Of (Hidden)),
               Point_Of (Hidden)),
            Signature_Challenge_Point (Challenge, Point_Of (Signer_Secret)))
         =
         Add (Signer_Nonce, Product));
      pragma Assert
        (Verify_Adaptor
           (Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret),
            Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden)),
            Point_Of (Hidden),
            Challenge,
            Point_Of (Signer_Secret)));
   end Prove_Adaptor_Verifies;

   procedure Prove_Completion_Verifies
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Challenge     : Scalar) is
      Product : constant Residue := Mul (Challenge, Signer_Secret);
   begin
      Prove_Nested_Adds_Form_Sum3 (Signer_Nonce, Product, Hidden);
      Prove_Sum3_Rotates (Signer_Nonce, Product, Hidden);
      pragma Assert
        (Add (Add (Signer_Nonce, Product), Hidden) =
         Add (Add (Signer_Nonce, Hidden), Product));
      pragma Assert
        (Verify_Completed
           (Complete
              (Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret),
               Hidden),
            Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden)),
            Challenge,
            Point_Of (Signer_Secret)));
   end Prove_Completion_Verifies;

   procedure Prove_Extraction
     (Adaptor : Scalar;
      Hidden  : Scalar) is
   begin
      Prove_Sub_Cancels_Add (Adaptor, Hidden);
   end Prove_Extraction;

   procedure Prove_Wrong_Secret_Does_Not_Verify
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Wrong_Hidden  : Scalar;
      Challenge     : Scalar) is
      Product : constant Residue := Mul (Challenge, Signer_Secret);
      Good    : constant Residue := Add (Add (Signer_Nonce, Hidden), Product);
      Bad     : constant Residue := Add (Add (Signer_Nonce, Product), Wrong_Hidden);
   begin
      Prove_Nested_Adds_Form_Sum3 (Signer_Nonce, Product, Wrong_Hidden);
      Prove_Nested_Adds_Form_Sum3 (Signer_Nonce, Hidden, Product);
      Prove_Sum3_Rotates (Signer_Nonce, Hidden, Product);
      pragma Assert (Good = Sum3 (Signer_Nonce, Product, Hidden));
      pragma Assert (Bad = Sum3 (Signer_Nonce, Product, Wrong_Hidden));
      pragma Assert (Bad /= Good);
      pragma Assert
        (not Verify_Completed
           (Complete
              (Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret),
               Wrong_Hidden),
            Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden)),
            Challenge,
            Point_Of (Signer_Secret)));
   end Prove_Wrong_Secret_Does_Not_Verify;
end Cdlc_Residue_Algebra;
