pragma SPARK_Mode (On);

package Cdlc_Residue_Algebra is
   Modulus : constant := 97;

   subtype Residue is Natural range 0 .. Modulus - 1;
   subtype Scalar is Residue;
   subtype Point is Residue;

   function Add (A, B : Residue) return Residue is
     (Residue ((Natural (A) + Natural (B)) mod Modulus));

   function Sub (A, B : Residue) return Residue is
     (Residue ((Natural (A) + Modulus - Natural (B)) mod Modulus));

   function Mul (A, B : Residue) return Residue is
     (Residue ((Natural (A) * Natural (B)) mod Modulus));

   function Sum3 (A, B, C : Residue) return Residue is
     (Residue ((Natural (A) + Natural (B) + Natural (C)) mod Modulus));

   function Point_Of (X : Scalar) return Point is (X);

   function Oracle_Attestation_Secret
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar) return Scalar
   is (Add (Oracle_Nonce, Mul (Challenge, Oracle_Secret)));

   function Oracle_Attestation_Point
     (Oracle_Nonce_Point : Point;
      Oracle_Public      : Point;
      Challenge          : Scalar) return Point
   is (Add (Oracle_Nonce_Point, Mul (Challenge, Oracle_Public)));

   function Adapted_Nonce_Point
     (Pre_Nonce_Point : Point;
      Adaptor_Point   : Point) return Point
   is (Add (Pre_Nonce_Point, Adaptor_Point));

   function Signature_Challenge_Point
     (Challenge : Scalar;
      Public_Key : Point) return Point
   is (Mul (Challenge, Public_Key));

   function Adaptor_Signature
     (Signer_Nonce  : Scalar;
      Challenge     : Scalar;
      Signer_Secret : Scalar) return Scalar
   is (Add (Signer_Nonce, Mul (Challenge, Signer_Secret)));

   function Complete
     (Adaptor : Scalar;
      Hidden  : Scalar) return Scalar
   is (Add (Adaptor, Hidden));

   function Extract
     (Completed : Scalar;
      Adaptor   : Scalar) return Scalar
   is (Sub (Completed, Adaptor));

   function Verify_Adaptor
     (Adaptor        : Scalar;
      Adapted_Nonce  : Point;
      Adaptor_Point  : Point;
      Challenge      : Scalar;
      Signer_Public  : Point) return Boolean
   is
     (Point_Of (Adaptor) =
        Add
          (Sub (Adapted_Nonce, Adaptor_Point),
           Signature_Challenge_Point (Challenge, Signer_Public)));

   function Verify_Completed
     (Completed      : Scalar;
      Adapted_Nonce  : Point;
      Challenge      : Scalar;
      Signer_Public  : Point) return Boolean
   is
     (Point_Of (Completed) =
        Add (Adapted_Nonce,
             Signature_Challenge_Point (Challenge, Signer_Public)));

   procedure Prove_Add_Commutes (A, B : Residue)
   with
     Global => null,
     Post => Add (A, B) = Add (B, A);

   procedure Prove_Sum3_Rotates (A, B, C : Residue)
   with
     Global => null,
     Post => Sum3 (A, B, C) = Sum3 (A, C, B);

   procedure Prove_Nested_Adds_Form_Sum3 (A, B, C : Residue)
   with
     Global => null,
     Post =>
       Add (Add (A, B), C) = Sum3 (A, B, C)
       and Add (Add (A, C), B) = Sum3 (A, C, B);

   procedure Prove_Sub_Cancels_Add (A, B : Residue)
   with
     Global => null,
     Post => Sub (Add (A, B), B) = A;

   procedure Prove_Oracle_Attestation
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar)
   with
     Global => null,
     Post =>
       Point_Of
         (Oracle_Attestation_Secret
            (Oracle_Nonce, Oracle_Secret, Challenge))
       =
       Oracle_Attestation_Point
         (Point_Of (Oracle_Nonce), Point_Of (Oracle_Secret), Challenge);

   procedure Prove_Adaptor_Verifies
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Challenge     : Scalar)
   with
     Global => null,
     Post =>
       Verify_Adaptor
         (Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret),
          Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden)),
          Point_Of (Hidden),
          Challenge,
          Point_Of (Signer_Secret));

   procedure Prove_Completion_Verifies
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Challenge     : Scalar)
   with
     Global => null,
     Post =>
       Verify_Completed
         (Complete
            (Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret),
             Hidden),
          Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden)),
          Challenge,
          Point_Of (Signer_Secret));

   procedure Prove_Extraction
     (Adaptor : Scalar;
      Hidden  : Scalar)
   with
     Global => null,
     Post => Extract (Complete (Adaptor, Hidden), Adaptor) = Hidden;

   procedure Prove_Wrong_Secret_Does_Not_Verify
     (Signer_Nonce  : Scalar;
      Signer_Secret : Scalar;
      Hidden        : Scalar;
      Wrong_Hidden  : Scalar;
      Challenge     : Scalar)
   with
     Global => null,
     Pre  => Wrong_Hidden /= Hidden,
     Post =>
       not Verify_Completed
         (Complete
            (Adaptor_Signature (Signer_Nonce, Challenge, Signer_Secret),
             Wrong_Hidden),
          Adapted_Nonce_Point (Point_Of (Signer_Nonce), Point_Of (Hidden)),
          Challenge,
          Point_Of (Signer_Secret));
end Cdlc_Residue_Algebra;
