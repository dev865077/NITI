pragma SPARK_Mode (On);

package body Cdlc_Algebra is
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
   begin
      null;
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
   begin
      null;
   end Prove_Wrong_Secret_Does_Not_Verify;
end Cdlc_Algebra;
