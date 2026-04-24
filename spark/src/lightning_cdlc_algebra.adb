pragma SPARK_Mode (On);

package body Lightning_Cdlc_Algebra is
   function Pay_A_To_B
     (State  : Channel_State;
      Amount : MilliSatoshi) return Channel_State
   is
      New_Bob_Int : constant Integer :=
        Integer (State.Bob) + Integer (Amount);
   begin
      pragma Assert
        (Integer (State.Alice) + Integer (State.Bob) = Channel_Capacity);
      pragma Assert (Integer (Amount) <= Integer (State.Alice));
      pragma Assert (Integer (State.Bob) <= Channel_Capacity);
      pragma Assert (New_Bob_Int <= Channel_Capacity);

      return
        (Alice => State.Alice - Amount,
         Bob   => MilliSatoshi (New_Bob_Int));
   end Pay_A_To_B;

   function HTLC_Settle_A_To_B
     (State   : Channel_State;
      Amount  : MilliSatoshi;
      Lock    : Digest;
      Witness : Scalar) return Channel_State
   is
   begin
      if HTLC_Redeems (Lock, Witness) then
         return Pay_A_To_B (State, Amount);
      else
         return State;
      end if;
   end HTLC_Settle_A_To_B;

   function PTLC_Settle_A_To_B
     (State   : Channel_State;
      Amount  : MilliSatoshi;
      Lock    : Point;
      Witness : Scalar) return Channel_State
   is
   begin
      if PTLC_Redeems (Lock, Witness) then
         return Pay_A_To_B (State, Amount);
      else
         return State;
      end if;
   end PTLC_Settle_A_To_B;

   procedure Prove_Sum3_Rotates (A, B, C : Element) is
   begin
      pragma Assert ((A + B) + C = (A + C) + B);
   end Prove_Sum3_Rotates;

   procedure Prove_Add_Cancel_Left (A, B, C : Element) is
   begin
      pragma Assert (B /= C);
      pragma Assert (A + B /= A + C);
   end Prove_Add_Cancel_Left;

   procedure Prove_Point_Is_Scalar_Embedding (X : Scalar) is
   begin
      pragma Assert (Point_Of (X) = X);
   end Prove_Point_Is_Scalar_Embedding;

   procedure Prove_Oracle_Point_Matches_Secret
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar) is
   begin
      null;
   end Prove_Oracle_Point_Matches_Secret;

   procedure Prove_Oracle_HTLC_Compatibility
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar) is
   begin
      null;
   end Prove_Oracle_HTLC_Compatibility;

   procedure Prove_Oracle_PTLC_Compatibility
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar) is
   begin
      Prove_Oracle_Point_Matches_Secret
        (Oracle_Nonce, Oracle_Secret, Challenge);
   end Prove_Oracle_PTLC_Compatibility;

   procedure Prove_HTLC_Correct_Secret_Settles (Secret : Scalar) is
   begin
      null;
   end Prove_HTLC_Correct_Secret_Settles;

   procedure Prove_HTLC_Wrong_Secret_Does_Not_Settle
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar) is
   begin
      null;
   end Prove_HTLC_Wrong_Secret_Does_Not_Settle;

   procedure Prove_PTLC_Correct_Secret_Settles (Secret : Scalar) is
   begin
      Prove_Point_Is_Scalar_Embedding (Secret);
   end Prove_PTLC_Correct_Secret_Settles;

   procedure Prove_PTLC_Wrong_Secret_Does_Not_Settle
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar) is
   begin
      Prove_Point_Is_Scalar_Embedding (Correct_Secret);
      Prove_Point_Is_Scalar_Embedding (Wrong_Secret);
   end Prove_PTLC_Wrong_Secret_Does_Not_Settle;

   procedure Prove_PTLC_Route_Atomicity
     (Downstream_Secret : Scalar;
      Hop_Tweak         : Scalar) is
   begin
      Prove_Point_Is_Scalar_Embedding (Downstream_Secret);
      Prove_Point_Is_Scalar_Embedding (Hop_Tweak);
      Prove_Point_Is_Scalar_Embedding
        (Route_Secret (Downstream_Secret, Hop_Tweak));
   end Prove_PTLC_Route_Atomicity;

   procedure Prove_PTLC_Route_Wrong_Secret_Fails
     (Downstream_Secret : Scalar;
      Hop_Tweak         : Scalar;
      Wrong_Secret      : Scalar) is
      Correct_Secret : constant Scalar :=
        Route_Secret (Downstream_Secret, Hop_Tweak);
   begin
      Prove_PTLC_Route_Atomicity (Downstream_Secret, Hop_Tweak);
      Prove_PTLC_Wrong_Secret_Does_Not_Settle
        (Correct_Secret, Wrong_Secret);
   end Prove_PTLC_Route_Wrong_Secret_Fails;

   procedure Prove_HTLC_Child_Activation
     (Child_Prepared : Boolean;
      Secret         : Scalar) is
   begin
      Prove_HTLC_Correct_Secret_Settles (Secret);
   end Prove_HTLC_Child_Activation;

   procedure Prove_HTLC_Child_Not_Activated_By_Wrong_Secret
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar) is
   begin
      Prove_HTLC_Wrong_Secret_Does_Not_Settle
        (Correct_Secret, Wrong_Secret);
   end Prove_HTLC_Child_Not_Activated_By_Wrong_Secret;

   procedure Prove_PTLC_Child_Activation
     (Child_Prepared : Boolean;
      Secret         : Scalar) is
   begin
      Prove_PTLC_Correct_Secret_Settles (Secret);
   end Prove_PTLC_Child_Activation;

   procedure Prove_PTLC_Child_Not_Activated_By_Wrong_Secret
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar) is
   begin
      Prove_PTLC_Wrong_Secret_Does_Not_Settle
        (Correct_Secret, Wrong_Secret);
   end Prove_PTLC_Child_Not_Activated_By_Wrong_Secret;

   procedure Prove_HTLC_Timeout_Refund_For_Wrong_Secret
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar) is
   begin
      Prove_HTLC_Wrong_Secret_Does_Not_Settle
        (Correct_Secret, Wrong_Secret);
   end Prove_HTLC_Timeout_Refund_For_Wrong_Secret;

   procedure Prove_PTLC_Timeout_Refund_For_Wrong_Secret
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar) is
   begin
      Prove_PTLC_Wrong_Secret_Does_Not_Settle
        (Correct_Secret, Wrong_Secret);
   end Prove_PTLC_Timeout_Refund_For_Wrong_Secret;

   procedure Prove_Channel_Payment_Conserves_Capacity
     (State  : Channel_State;
      Amount : MilliSatoshi) is
      Paid_State : constant Channel_State := Pay_A_To_B (State, Amount);
   begin
      pragma Assert (Valid_State (Paid_State));
   end Prove_Channel_Payment_Conserves_Capacity;

   procedure Prove_HTLC_Settle_Pays
     (State  : Channel_State;
      Amount : MilliSatoshi;
      Secret : Scalar) is
   begin
      Prove_HTLC_Correct_Secret_Settles (Secret);
   end Prove_HTLC_Settle_Pays;

   procedure Prove_HTLC_Wrong_Secret_Keeps_State
     (State          : Channel_State;
      Amount         : MilliSatoshi;
      Correct_Secret : Scalar;
      Wrong_Secret   : Scalar) is
   begin
      Prove_HTLC_Wrong_Secret_Does_Not_Settle
        (Correct_Secret, Wrong_Secret);
   end Prove_HTLC_Wrong_Secret_Keeps_State;

   procedure Prove_PTLC_Settle_Pays
     (State  : Channel_State;
      Amount : MilliSatoshi;
      Secret : Scalar) is
   begin
      Prove_PTLC_Correct_Secret_Settles (Secret);
   end Prove_PTLC_Settle_Pays;

   procedure Prove_PTLC_Wrong_Secret_Keeps_State
     (State          : Channel_State;
      Amount         : MilliSatoshi;
      Correct_Secret : Scalar;
      Wrong_Secret   : Scalar) is
   begin
      Prove_PTLC_Wrong_Secret_Does_Not_Settle
        (Correct_Secret, Wrong_Secret);
   end Prove_PTLC_Wrong_Secret_Keeps_State;
end Lightning_Cdlc_Algebra;
