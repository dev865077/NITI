pragma SPARK_Mode (On);

package body Accumulators_Decumulators_Algebra is
   procedure Prove_Branch_Coverage_Disjointness
     (Settlement : Price;
      Barrier    : Price;
      Strike     : Price) is
   begin
      if Settlement >= Barrier then
         pragma Assert (Knock_Out (Settlement, Barrier));
         pragma Assert
           (not Multiplied_Quantity_Branch (Settlement, Barrier, Strike));
         pragma Assert
           (not Base_Quantity_Branch (Settlement, Barrier, Strike));
      elsif Settlement <= Strike then
         pragma Assert
           (Multiplied_Quantity_Branch (Settlement, Barrier, Strike));
         pragma Assert (not Knock_Out (Settlement, Barrier));
         pragma Assert
           (not Base_Quantity_Branch (Settlement, Barrier, Strike));
      else
         pragma Assert (Base_Quantity_Branch (Settlement, Barrier, Strike));
         pragma Assert (not Knock_Out (Settlement, Barrier));
         pragma Assert
           (not Multiplied_Quantity_Branch (Settlement, Barrier, Strike));
      end if;
   end Prove_Branch_Coverage_Disjointness;

   procedure Prove_Live_State_Absorption
     (Live        : Boolean;
      Knocked_Out : Boolean) is
   begin
      pragma Assert (not Live);
      pragma Assert (not Next_Live (Live, Knocked_Out));
   end Prove_Live_State_Absorption;

   procedure Prove_Continuation_Requires_Live_No_Knockout
     (Live        : Boolean;
      Knocked_Out : Boolean) is
   begin
      pragma Assert (Next_Live (Live, Knocked_Out));
      pragma Assert (Live);
      pragma Assert (not Knocked_Out);
   end Prove_Continuation_Requires_Live_No_Knockout;

   procedure Prove_Period_Quantity_Zero_When_Terminal
     (Live        : Boolean;
      Knocked_Out : Boolean;
      Base_Q      : Amount;
      Multiplier  : Multiplier_Value;
      Settlement  : Price;
      Strike      : Price) is
   begin
      pragma Assert ((not Live) or Knocked_Out);
      pragma Assert
        (Period_Quantity
           (Live, Knocked_Out, Base_Q, Multiplier, Settlement, Strike)
         = 0);
   end Prove_Period_Quantity_Zero_When_Terminal;

   procedure Prove_Live_Settlement_Quantity_Bounds
     (Base_Q      : Amount;
      Multiplier  : Multiplier_Value;
      Settlement  : Price;
      Strike      : Price) is
      Q : constant Amount :=
        Period_Quantity (True, False, Base_Q, Multiplier, Settlement, Strike);
   begin
      if Settlement <= Strike then
         pragma Assert (Q = Base_Q * Multiplier);
         pragma Assert (Q >= Base_Q);
      else
         pragma Assert (Q = Base_Q);
         pragma Assert (Q <= Base_Q * Multiplier);
      end if;
      pragma Assert (Q >= Base_Q);
      pragma Assert (Q <= Base_Q * Multiplier);
   end Prove_Live_Settlement_Quantity_Bounds;

   procedure Prove_Cumulative_Quantity_Update_Exact
     (Cum_Q : Amount;
      Q     : Amount) is
   begin
      pragma Assert (Next_Cum_Q (Cum_Q, Q) = Cum_Q + Q);
      pragma Assert (Next_Cum_Q (Cum_Q, Q) - Cum_Q = Q);
   end Prove_Cumulative_Quantity_Update_Exact;

   procedure Prove_Cumulative_Cash_Update_Exact
     (Cash_Scaled : Amount;
      Q           : Amount;
      Strike      : Price) is
   begin
      pragma Assert
        (Next_Cash_Scaled (Cash_Scaled, Q, Strike)
         = Cash_Scaled + Q * Strike);
      pragma Assert
        (Next_Cash_Scaled (Cash_Scaled, Q, Strike) - Cash_Scaled
         = Q * Strike);
   end Prove_Cumulative_Cash_Update_Exact;

   procedure Prove_Accumulator_BTC_Conservation
     (Collateral_Sats : Amount;
      Q               : Amount) is
   begin
      pragma Assert
        (Next_Accumulator_Collateral (Collateral_Sats, Q)
         = Collateral_Sats - Q);
      pragma Assert (Next_Accumulator_Collateral (Collateral_Sats, Q) >= 0);
      pragma Assert
        (Next_Accumulator_Collateral (Collateral_Sats, Q) + Q
         = Collateral_Sats);
   end Prove_Accumulator_BTC_Conservation;

   procedure Prove_Decumulator_BTC_Conservation
     (Inventory_Sats : Amount;
      Q              : Amount) is
   begin
      pragma Assert
        (Next_Decumulator_Inventory (Inventory_Sats, Q)
         = Inventory_Sats - Q);
      pragma Assert (Next_Decumulator_Inventory (Inventory_Sats, Q) >= 0);
      pragma Assert
        (Next_Decumulator_Inventory (Inventory_Sats, Q) + Q
         = Inventory_Sats);
   end Prove_Decumulator_BTC_Conservation;

   procedure Prove_Decumulator_Cash_Escrow_Conservation
     (Cash_Escrow_Scaled : Amount;
      Q                  : Amount;
      Strike             : Price) is
      Period_Cash : constant Amount := Q * Strike;
   begin
      pragma Assert
        (Next_Cash_Escrow_Scaled (Cash_Escrow_Scaled, Q, Strike)
         = Cash_Escrow_Scaled - Period_Cash);
      pragma Assert
        (Next_Cash_Escrow_Scaled (Cash_Escrow_Scaled, Q, Strike) >= 0);
      pragma Assert
        (Next_Cash_Escrow_Scaled (Cash_Escrow_Scaled, Q, Strike)
         + Period_Cash = Cash_Escrow_Scaled);
   end Prove_Decumulator_Cash_Escrow_Conservation;

   procedure Prove_Knockout_Stops_Future_Accumulation
     (Cum_Q       : Amount;
      Cash_Scaled : Amount;
      Base_Q      : Amount;
      Multiplier  : Multiplier_Value;
      Settlement  : Price;
      Strike      : Price) is
      Q : constant Amount :=
        Period_Quantity (False, False, Base_Q, Multiplier, Settlement, Strike);
   begin
      pragma Assert (Q = 0);
      pragma Assert (Next_Cum_Q (Cum_Q, Q) = Cum_Q);
      pragma Assert (Next_Cash_Scaled (Cash_Scaled, Q, Strike) = Cash_Scaled);
   end Prove_Knockout_Stops_Future_Accumulation;

   procedure Prove_Two_Period_Quantity_Exact_And_Bounded
     (Cum_0  : Amount;
      Q_0    : Amount;
      Q_1    : Amount;
      Base_0 : Amount;
      M_0    : Multiplier_Value;
      Base_1 : Amount;
      M_1    : Multiplier_Value) is
   begin
      pragma Assert
        (Two_Period_Cum_Q (Cum_0, Q_0, Q_1) = Cum_0 + Q_0 + Q_1);
      pragma Assert (Q_0 + Q_1 <= Base_0 * M_0 + Base_1 * M_1);
      pragma Assert
        (Cum_0 + Q_0 + Q_1
         <= Cum_0 + Base_0 * M_0 + Base_1 * M_1);
   end Prove_Two_Period_Quantity_Exact_And_Bounded;

   procedure Prove_Two_Period_Cash_Exact_And_Bounded
     (Cash_0 : Amount;
      Q_0    : Amount;
      K_0    : Price;
      Q_1    : Amount;
      K_1    : Price;
      Base_0 : Amount;
      M_0    : Multiplier_Value;
      Base_1 : Amount;
      M_1    : Multiplier_Value) is
   begin
      pragma Assert
        (Two_Period_Cash_Scaled (Cash_0, Q_0, K_0, Q_1, K_1)
         = Cash_0 + Q_0 * K_0 + Q_1 * K_1);
      pragma Assert (Q_0 * K_0 <= Base_0 * M_0 * K_0);
      pragma Assert (Q_1 * K_1 <= Base_1 * M_1 * K_1);
      pragma Assert
        (Q_0 * K_0 + Q_1 * K_1
         <= Base_0 * M_0 * K_0 + Base_1 * M_1 * K_1);
      pragma Assert
        (Cash_0 + Q_0 * K_0 + Q_1 * K_1
         <= Cash_0 + Base_0 * M_0 * K_0 + Base_1 * M_1 * K_1);
   end Prove_Two_Period_Cash_Exact_And_Bounded;

   procedure Prove_Floor_Cash_Rounding_Bound
     (Cash_Scaled : Amount;
      Cash_Cents  : Amount) is
   begin
      pragma Assert (Cash_Cents * SAT <= Cash_Scaled);
      pragma Assert (Cash_Scaled < (Cash_Cents + 1) * SAT);
      pragma Assert (Cash_Scaled - Cash_Cents * SAT >= 0);
      pragma Assert (Cash_Scaled - Cash_Cents * SAT < SAT);
   end Prove_Floor_Cash_Rounding_Bound;

   procedure Prove_Ceil_Cash_Rounding_Bound_Positive
     (Cash_Scaled : Amount;
      Cash_Cents  : Amount) is
   begin
      pragma Assert (Cash_Cents * SAT >= Cash_Scaled);
      if Cash_Cents = 0 then
         pragma Assert (Cash_Cents * SAT = 0);
         pragma Assert (Cash_Scaled > 0);
      else
         pragma Assert ((Cash_Cents - 1) * SAT < Cash_Scaled);
         pragma Assert (Cash_Cents * SAT =
                        (Cash_Cents - 1) * SAT + SAT);
         pragma Assert (Cash_Cents * SAT < Cash_Scaled + SAT);
         pragma Assert (Cash_Cents * SAT - Cash_Scaled < SAT);
      end if;
      pragma Assert (Cash_Cents * SAT - Cash_Scaled >= 0);
   end Prove_Ceil_Cash_Rounding_Bound_Positive;

   procedure Prove_Ceil_Cash_Rounding_Bound_Zero
     (Cash_Scaled : Amount;
      Cash_Cents  : Amount) is
   begin
      pragma Assert (Cash_Scaled = 0);
      if Cash_Cents = 0 then
         pragma Assert (Cash_Cents * SAT = 0);
      else
         pragma Assert ((Cash_Cents - 1) * SAT < Cash_Scaled);
         pragma Assert (Cash_Cents - 1 >= 0);
         pragma Assert ((Cash_Cents - 1) * SAT >= 0);
      end if;
      pragma Assert (Cash_Cents = 0);
      pragma Assert (Cash_Cents * SAT - Cash_Scaled = 0);
   end Prove_Ceil_Cash_Rounding_Bound_Zero;
end Accumulators_Decumulators_Algebra;
