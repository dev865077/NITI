pragma SPARK_Mode (On);

package Cdlc_Algebra is
   Modulus : constant := 97;

   type Element is mod Modulus;

   subtype Scalar is Element;
   subtype Point is Element;

   G : constant Point := 1;

   function Point_Of (X : Scalar) return Point is (X * G);

   function Oracle_Attestation_Secret
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar) return Scalar
   is (Oracle_Nonce + Challenge * Oracle_Secret);

   function Oracle_Attestation_Point
     (Oracle_Nonce_Point : Point;
      Oracle_Public      : Point;
      Challenge          : Scalar) return Point
   is (Oracle_Nonce_Point + Challenge * Oracle_Public);

   function Adapted_Nonce_Point
     (Pre_Nonce_Point : Point;
      Adaptor_Point   : Point) return Point
   is (Pre_Nonce_Point + Adaptor_Point);

   function Signature_Challenge_Point
     (Challenge : Scalar;
      Public_Key : Point) return Point
   is (Challenge * Public_Key);

   function Adaptor_Signature
     (Signer_Nonce  : Scalar;
      Challenge     : Scalar;
      Signer_Secret : Scalar) return Scalar
   is (Signer_Nonce + Challenge * Signer_Secret);

   function Complete
     (Adaptor : Scalar;
      Hidden  : Scalar) return Scalar
   is (Adaptor + Hidden);

   function Extract
     (Completed : Scalar;
      Adaptor   : Scalar) return Scalar
   is (Completed - Adaptor);

   function Verify_Adaptor
     (Adaptor        : Scalar;
      Adapted_Nonce  : Point;
      Adaptor_Point  : Point;
      Challenge      : Scalar;
      Signer_Public  : Point) return Boolean
   is
     (Point_Of (Adaptor) =
        Adapted_Nonce - Adaptor_Point
        + Signature_Challenge_Point (Challenge, Signer_Public));

   function Verify_Completed
     (Completed      : Scalar;
      Adapted_Nonce  : Point;
      Challenge      : Scalar;
      Signer_Public  : Point) return Boolean
   is
     (Point_Of (Completed) =
        Adapted_Nonce + Signature_Challenge_Point (Challenge, Signer_Public));

   procedure Prove_Sum3_Rotates (A, B, C : Element)
   with
     Ghost,
     Global => null,
     Post => (A + B) + C = (A + C) + B;

   procedure Prove_Add_Cancel_Left (A, B, C : Element)
   with
     Ghost,
     Global => null,
     Pre  => B /= C,
     Post => A + B /= A + C;

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
end Cdlc_Algebra;
