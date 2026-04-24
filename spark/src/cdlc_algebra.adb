pragma SPARK_Mode (On);

package body Cdlc_Algebra is
   procedure Prove_Sum3_Rotates (A, B, C : Element) is
   begin
      pragma Assert ((A + B) + C = (A + C) + B);
   end Prove_Sum3_Rotates;

   procedure Prove_Add_Cancel_Left (A, B, C : Element) is
   begin
      pragma Assert (B /= C);
      pragma Assert (A + B /= A + C);
   end Prove_Add_Cancel_Left;

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
   begin
      null;
   end Prove_Adaptor_Verifies;

   procedure Prove_Completion_Verifies
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Challenge     : Scalar) is
      Product : constant Element := Challenge * Signer_Secret;
   begin
      Prove_Sum3_Rotates (Signer_Nonce, Product, Hidden);
      pragma Assert
        (Complete
           (Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret),
            Hidden)
         =
         (Signer_Nonce + Product) + Hidden);
      pragma Assert
        (Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden))
         + Signature_Challenge_Point (Challenge, Point_Of (Signer_Secret))
         =
         (Signer_Nonce + Hidden) + Product);
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
      null;
   end Prove_Extraction;

   procedure Prove_Wrong_Secret_Does_Not_Verify
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Wrong_Hidden  : Scalar;
      Challenge     : Scalar) is
      Product : constant Element := Challenge * Signer_Secret;
      Prefix  : constant Element := Signer_Nonce + Product;
   begin
      Prove_Sum3_Rotates (Signer_Nonce, Product, Hidden);
      Prove_Add_Cancel_Left (Prefix, Wrong_Hidden, Hidden);
      pragma Assert
        (Complete
           (Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret),
            Wrong_Hidden)
         =
         Prefix + Wrong_Hidden);
      pragma Assert
        (Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden))
         + Signature_Challenge_Point (Challenge, Point_Of (Signer_Secret))
         =
         Prefix + Hidden);
      pragma Assert
        (Complete
           (Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret),
            Wrong_Hidden)
         /=
         Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden))
         + Signature_Challenge_Point (Challenge, Point_Of (Signer_Secret)));
      pragma Assert
        (not Verify_Completed
           (Complete
              (Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret),
               Wrong_Hidden),
            Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden)),
            Challenge,
            Point_Of (Signer_Secret)));
   end Prove_Wrong_Secret_Does_Not_Verify;
end Cdlc_Algebra;
