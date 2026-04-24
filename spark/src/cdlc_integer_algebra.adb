pragma SPARK_Mode (On);

package body Cdlc_Integer_Algebra is
   procedure Prove_Oracle_Attestation
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar) is
   begin
      pragma Assert
        (Point_Of
           (Oracle_Attestation_Secret
              (Oracle_Nonce, Oracle_Secret, Challenge))
         =
         Oracle_Attestation_Point
           (Point_Of (Oracle_Nonce), Point_Of (Oracle_Secret), Challenge));
   end Prove_Oracle_Attestation;

   procedure Prove_Adaptor_Verifies
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Challenge     : Scalar) is
      Adaptor : constant Scalar :=
        Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret);
      R_Star  : constant Point :=
        Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden));
   begin
      pragma Assert (R_Star - Point_Of (Hidden) = Point_Of (Signer_Nonce));
      pragma Assert
        (Adaptor =
           Signer_Nonce + Challenge * Signer_Secret);
      pragma Assert
        (Verify_Adaptor
           (Adaptor,
            R_Star,
            Point_Of (Hidden),
            Challenge,
            Point_Of (Signer_Secret)));
   end Prove_Adaptor_Verifies;

   procedure Prove_Completion_Verifies
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Challenge     : Scalar) is
      Adaptor  : constant Scalar :=
        Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret);
      Complete_Sig : constant Scalar := Complete (Adaptor, Hidden);
      R_Star   : constant Point :=
        Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden));
   begin
      pragma Assert
        (Complete_Sig =
           Signer_Nonce + Challenge * Signer_Secret + Hidden);
      pragma Assert
        (R_Star + Signature_Challenge_Point
           (Challenge, Point_Of (Signer_Secret))
         =
         Signer_Nonce + Hidden + Challenge * Signer_Secret);
      pragma Assert
        (Verify_Completed
           (Complete_Sig,
            R_Star,
            Challenge,
            Point_Of (Signer_Secret)));
   end Prove_Completion_Verifies;

   procedure Prove_Extraction
     (Adaptor : Scalar;
      Hidden  : Scalar) is
   begin
      pragma Assert (Extract (Complete (Adaptor, Hidden), Adaptor) = Hidden);
   end Prove_Extraction;

   procedure Prove_Wrong_Secret_Does_Not_Verify
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Wrong_Hidden  : Scalar;
      Challenge     : Scalar) is
      Adaptor : constant Scalar :=
        Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret);
      Wrong_Completed : constant Scalar := Complete (Adaptor, Wrong_Hidden);
      R_Star : constant Point :=
        Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden));
   begin
      pragma Assert (Wrong_Hidden /= Hidden);
      pragma Assert
        (Wrong_Completed =
           Signer_Nonce + Challenge * Signer_Secret + Wrong_Hidden);
      pragma Assert
        (R_Star + Signature_Challenge_Point
           (Challenge, Point_Of (Signer_Secret))
         =
         Signer_Nonce + Hidden + Challenge * Signer_Secret);
      pragma Assert
        (Wrong_Completed /=
           R_Star + Signature_Challenge_Point
             (Challenge, Point_Of (Signer_Secret)));
      pragma Assert
        (not Verify_Completed
           (Wrong_Completed,
            R_Star,
            Challenge,
            Point_Of (Signer_Secret)));
   end Prove_Wrong_Secret_Does_Not_Verify;
end Cdlc_Integer_Algebra;
