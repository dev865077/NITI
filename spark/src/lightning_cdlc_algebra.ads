pragma SPARK_Mode (On);

package Lightning_Cdlc_Algebra is
   Modulus : constant := 97;

   type Element is mod Modulus;

   subtype Scalar is Element;
   subtype Point is Element;
   subtype Digest is Element;

   G : constant Point := 1;

   Channel_Capacity : constant := 1_000_000;
   subtype MilliSatoshi is Integer range 0 .. Channel_Capacity;

   type Channel_State is record
      Alice : MilliSatoshi;
      Bob   : MilliSatoshi;
   end record;

   function Point_Of (X : Scalar) return Point is (X * G);

   -- Ideal injective digest model. Real HTLCs require hash security outside
   -- this finite algebraic proof.
   function Hash_Of (X : Scalar) return Digest is (X);

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

   function Oracle_HTLC_Lock
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar) return Digest
   is
     (Hash_Of
        (Oracle_Attestation_Secret
           (Oracle_Nonce, Oracle_Secret, Challenge)));

   function Oracle_PTLC_Lock
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar) return Point
   is
     (Oracle_Attestation_Point
        (Point_Of (Oracle_Nonce), Point_Of (Oracle_Secret), Challenge));

   function HTLC_Redeems
     (Lock    : Digest;
      Witness : Scalar) return Boolean
   is (Hash_Of (Witness) = Lock);

   function PTLC_Redeems
     (Lock    : Point;
      Witness : Scalar) return Boolean
   is (Point_Of (Witness) = Lock);

   function HTLC_Route_Redeems
     (First_Lock  : Digest;
      Second_Lock : Digest;
      Third_Lock  : Digest;
      Witness     : Scalar) return Boolean
   is
     (HTLC_Redeems (First_Lock, Witness)
      and HTLC_Redeems (Second_Lock, Witness)
      and HTLC_Redeems (Third_Lock, Witness));

   function Route_Point
     (Downstream_Point : Point;
      Hop_Tweak        : Scalar) return Point
   is (Downstream_Point + Point_Of (Hop_Tweak));

   function Route_Secret
     (Downstream_Secret : Scalar;
      Hop_Tweak         : Scalar) return Scalar
   is (Downstream_Secret + Hop_Tweak);

   function Route_Point_2
     (Final_Point  : Point;
      First_Tweak  : Scalar;
      Second_Tweak : Scalar) return Point
   is (Route_Point (Route_Point (Final_Point, Second_Tweak), First_Tweak));

   function Route_Secret_2
     (Final_Secret : Scalar;
      First_Tweak  : Scalar;
      Second_Tweak : Scalar) return Scalar
   is (Route_Secret (Route_Secret (Final_Secret, Second_Tweak), First_Tweak));

   function Child_Activated_By_HTLC
     (Child_Prepared : Boolean;
      Lock           : Digest;
      Witness        : Scalar) return Boolean
   is (Child_Prepared and HTLC_Redeems (Lock, Witness));

   function Child_Activated_By_PTLC
     (Child_Prepared : Boolean;
      Lock           : Point;
      Witness        : Scalar) return Boolean
   is (Child_Prepared and PTLC_Redeems (Lock, Witness));

   function Timeout_Refunds
     (Redeemed : Boolean;
      Expired  : Boolean) return Boolean
   is (Expired and not Redeemed);

   function Valid_State (State : Channel_State) return Boolean is
     (Integer (State.Alice) + Integer (State.Bob) = Channel_Capacity);

   function Pay_A_To_B
     (State  : Channel_State;
      Amount : MilliSatoshi) return Channel_State
   with
     Global => null,
     Pre  => Valid_State (State) and Amount <= State.Alice,
     Post =>
       Valid_State (Pay_A_To_B'Result)
       and Pay_A_To_B'Result.Alice = State.Alice - Amount
       and Pay_A_To_B'Result.Bob = State.Bob + Amount;

   function HTLC_Settle_A_To_B
     (State   : Channel_State;
      Amount  : MilliSatoshi;
      Lock    : Digest;
      Witness : Scalar) return Channel_State
   with
     Global => null,
     Pre  => Valid_State (State) and Amount <= State.Alice,
     Post =>
       Valid_State (HTLC_Settle_A_To_B'Result)
       and
       (if HTLC_Redeems (Lock, Witness) then
          HTLC_Settle_A_To_B'Result = Pay_A_To_B (State, Amount)
        else
          HTLC_Settle_A_To_B'Result = State);

   function PTLC_Settle_A_To_B
     (State   : Channel_State;
      Amount  : MilliSatoshi;
      Lock    : Point;
      Witness : Scalar) return Channel_State
   with
     Global => null,
     Pre  => Valid_State (State) and Amount <= State.Alice,
     Post =>
       Valid_State (PTLC_Settle_A_To_B'Result)
       and
       (if PTLC_Redeems (Lock, Witness) then
          PTLC_Settle_A_To_B'Result = Pay_A_To_B (State, Amount)
        else
          PTLC_Settle_A_To_B'Result = State);

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

   procedure Prove_Point_Is_Scalar_Embedding (X : Scalar)
   with
     Global => null,
     Post => Point_Of (X) = X;

   procedure Prove_Oracle_Point_Matches_Secret
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

   procedure Prove_Oracle_HTLC_Compatibility
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar)
   with
     Global => null,
     Post =>
       HTLC_Redeems
         (Oracle_HTLC_Lock (Oracle_Nonce, Oracle_Secret, Challenge),
          Oracle_Attestation_Secret
            (Oracle_Nonce, Oracle_Secret, Challenge));

   procedure Prove_Oracle_PTLC_Compatibility
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar)
   with
     Global => null,
     Post =>
       PTLC_Redeems
         (Oracle_PTLC_Lock (Oracle_Nonce, Oracle_Secret, Challenge),
          Oracle_Attestation_Secret
            (Oracle_Nonce, Oracle_Secret, Challenge));

   procedure Prove_HTLC_And_Adaptor_Synchronize
     (Oracle_Nonce  : Scalar;
      Oracle_Secret : Scalar;
      Challenge     : Scalar)
   with
     Global => null,
     Post =>
       HTLC_Redeems
         (Oracle_HTLC_Lock (Oracle_Nonce, Oracle_Secret, Challenge),
          Oracle_Attestation_Secret
            (Oracle_Nonce, Oracle_Secret, Challenge))
       and
       PTLC_Redeems
         (Oracle_PTLC_Lock (Oracle_Nonce, Oracle_Secret, Challenge),
          Oracle_Attestation_Secret
            (Oracle_Nonce, Oracle_Secret, Challenge));

   procedure Prove_HTLC_Correct_Secret_Settles (Secret : Scalar)
   with
     Global => null,
     Post => HTLC_Redeems (Hash_Of (Secret), Secret);

   procedure Prove_HTLC_Wrong_Secret_Does_Not_Settle
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar)
   with
     Global => null,
     Pre  => Correct_Secret /= Wrong_Secret,
     Post => not HTLC_Redeems (Hash_Of (Correct_Secret), Wrong_Secret);

   procedure Prove_HTLC_Route_Atomicity (Secret : Scalar)
   with
     Global => null,
     Post =>
       HTLC_Route_Redeems
         (Hash_Of (Secret), Hash_Of (Secret), Hash_Of (Secret), Secret);

   procedure Prove_HTLC_Route_Wrong_Secret_Fails
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar)
   with
     Global => null,
     Pre  => Correct_Secret /= Wrong_Secret,
     Post =>
       not HTLC_Route_Redeems
         (Hash_Of (Correct_Secret),
          Hash_Of (Correct_Secret),
          Hash_Of (Correct_Secret),
          Wrong_Secret);

   procedure Prove_PTLC_Correct_Secret_Settles (Secret : Scalar)
   with
     Global => null,
     Post => PTLC_Redeems (Point_Of (Secret), Secret);

   procedure Prove_PTLC_Wrong_Secret_Does_Not_Settle
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar)
   with
     Global => null,
     Pre  => Correct_Secret /= Wrong_Secret,
     Post => not PTLC_Redeems (Point_Of (Correct_Secret), Wrong_Secret);

   procedure Prove_PTLC_Route_Atomicity
     (Downstream_Secret : Scalar;
      Hop_Tweak         : Scalar)
   with
     Global => null,
     Post =>
       PTLC_Redeems
         (Route_Point (Point_Of (Downstream_Secret), Hop_Tweak),
          Route_Secret (Downstream_Secret, Hop_Tweak));

   procedure Prove_PTLC_Route_Wrong_Secret_Fails
     (Downstream_Secret : Scalar;
      Hop_Tweak         : Scalar;
      Wrong_Secret      : Scalar)
   with
     Global => null,
     Pre => Wrong_Secret /= Route_Secret (Downstream_Secret, Hop_Tweak),
     Post =>
       not PTLC_Redeems
         (Route_Point (Point_Of (Downstream_Secret), Hop_Tweak),
          Wrong_Secret);

   procedure Prove_PTLC_Two_Hop_Route_Atomicity
     (Final_Secret : Scalar;
      First_Tweak  : Scalar;
      Second_Tweak : Scalar)
   with
     Global => null,
     Post =>
       PTLC_Redeems
         (Route_Point_2
            (Point_Of (Final_Secret), First_Tweak, Second_Tweak),
          Route_Secret_2 (Final_Secret, First_Tweak, Second_Tweak));

   procedure Prove_PTLC_Two_Hop_Wrong_Secret_Fails
     (Final_Secret : Scalar;
      First_Tweak  : Scalar;
      Second_Tweak : Scalar;
      Wrong_Secret : Scalar)
   with
     Global => null,
     Pre =>
       Wrong_Secret /=
       Route_Secret_2 (Final_Secret, First_Tweak, Second_Tweak),
     Post =>
       not PTLC_Redeems
         (Route_Point_2
            (Point_Of (Final_Secret), First_Tweak, Second_Tweak),
          Wrong_Secret);

   procedure Prove_HTLC_Child_Activation
     (Child_Prepared : Boolean;
      Secret         : Scalar)
   with
     Global => null,
     Post =>
       Child_Activated_By_HTLC
         (Child_Prepared, Hash_Of (Secret), Secret) = Child_Prepared;

   procedure Prove_HTLC_Child_Not_Activated_By_Wrong_Secret
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar)
   with
     Global => null,
     Pre  => Correct_Secret /= Wrong_Secret,
     Post =>
       not Child_Activated_By_HTLC
         (True, Hash_Of (Correct_Secret), Wrong_Secret);

   procedure Prove_PTLC_Child_Activation
     (Child_Prepared : Boolean;
      Secret         : Scalar)
   with
     Global => null,
     Post =>
       Child_Activated_By_PTLC
         (Child_Prepared, Point_Of (Secret), Secret) = Child_Prepared;

   procedure Prove_PTLC_Child_Not_Activated_By_Wrong_Secret
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar)
   with
     Global => null,
     Pre  => Correct_Secret /= Wrong_Secret,
     Post =>
       not Child_Activated_By_PTLC
         (True, Point_Of (Correct_Secret), Wrong_Secret);

   procedure Prove_HTLC_Timeout_Refund_For_Wrong_Secret
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar)
   with
     Global => null,
     Pre  => Correct_Secret /= Wrong_Secret,
     Post =>
       Timeout_Refunds
         (HTLC_Redeems (Hash_Of (Correct_Secret), Wrong_Secret), True);

   procedure Prove_PTLC_Timeout_Refund_For_Wrong_Secret
     (Correct_Secret : Scalar;
      Wrong_Secret   : Scalar)
   with
     Global => null,
     Pre  => Correct_Secret /= Wrong_Secret,
     Post =>
       Timeout_Refunds
         (PTLC_Redeems (Point_Of (Correct_Secret), Wrong_Secret), True);

   procedure Prove_HTLC_Timeout_Does_Not_Refund_After_Redemption
     (Secret : Scalar)
   with
     Global => null,
     Post =>
       not Timeout_Refunds
         (HTLC_Redeems (Hash_Of (Secret), Secret), True);

   procedure Prove_PTLC_Timeout_Does_Not_Refund_After_Redemption
     (Secret : Scalar)
   with
     Global => null,
     Post =>
       not Timeout_Refunds
         (PTLC_Redeems (Point_Of (Secret), Secret), True);

   procedure Prove_Channel_Payment_Conserves_Capacity
     (State  : Channel_State;
      Amount : MilliSatoshi)
   with
     Global => null,
     Pre  => Valid_State (State) and Amount <= State.Alice,
     Post => Valid_State (Pay_A_To_B (State, Amount));

   procedure Prove_HTLC_Settle_Pays
     (State  : Channel_State;
      Amount : MilliSatoshi;
      Secret : Scalar)
   with
     Global => null,
     Pre  => Valid_State (State) and Amount <= State.Alice,
     Post =>
       HTLC_Settle_A_To_B (State, Amount, Hash_Of (Secret), Secret)
       =
       Pay_A_To_B (State, Amount);

   procedure Prove_HTLC_Wrong_Secret_Keeps_State
     (State          : Channel_State;
      Amount         : MilliSatoshi;
      Correct_Secret : Scalar;
      Wrong_Secret   : Scalar)
   with
     Global => null,
     Pre =>
       Valid_State (State)
       and Amount <= State.Alice
       and Correct_Secret /= Wrong_Secret,
     Post =>
       HTLC_Settle_A_To_B
         (State, Amount, Hash_Of (Correct_Secret), Wrong_Secret) = State;

   procedure Prove_PTLC_Settle_Pays
     (State  : Channel_State;
      Amount : MilliSatoshi;
      Secret : Scalar)
   with
     Global => null,
     Pre  => Valid_State (State) and Amount <= State.Alice,
     Post =>
       PTLC_Settle_A_To_B (State, Amount, Point_Of (Secret), Secret)
       =
       Pay_A_To_B (State, Amount);

   procedure Prove_PTLC_Wrong_Secret_Keeps_State
     (State          : Channel_State;
      Amount         : MilliSatoshi;
      Correct_Secret : Scalar;
      Wrong_Secret   : Scalar)
   with
     Global => null,
     Pre =>
       Valid_State (State)
       and Amount <= State.Alice
       and Correct_Secret /= Wrong_Secret,
     Post =>
       PTLC_Settle_A_To_B
         (State, Amount, Point_Of (Correct_Secret), Wrong_Secret) = State;
end Lightning_Cdlc_Algebra;
