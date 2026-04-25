pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Accumulators_Decumulators_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Price is Valid_Big_Integer;
   subtype Multiplier_Value is Valid_Big_Integer;

   SAT : constant Amount := 100_000_000;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);
   function Valid_Multiplier (M : Multiplier_Value) return Boolean is
     (M >= 1);

   --  #20: KnockOut_i holds when S_i >= H_i.
   function Knock_Out
     (Settlement : Price;
      Barrier    : Price) return Boolean
   is (Settlement >= Barrier)
   with
     Pre => Positive (Settlement) and Nonnegative (Barrier);

   --  #20: MultipliedQuantity_i holds when S_i < H_i and S_i <= K_i.
   function Multiplied_Quantity_Branch
     (Settlement : Price;
      Barrier    : Price;
      Strike     : Price) return Boolean
   is (Settlement < Barrier and Settlement <= Strike)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Barrier)
       and Nonnegative (Strike);

   --  #20: BaseQuantity_i holds when S_i < H_i and S_i > K_i.
   function Base_Quantity_Branch
     (Settlement : Price;
      Barrier    : Price;
      Strike     : Price) return Boolean
   is (Settlement < Barrier and Settlement > Strike)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Barrier)
       and Nonnegative (Strike);

   --  #20: Live_{i+1} = Live_i and not KnockOut_i.
   function Next_Live
     (Live           : Boolean;
      Knocked_Out    : Boolean) return Boolean
   is (Live and not Knocked_Out);

   --  #20:
   --    q_i = 0 if terminal or knocked out;
   --    q_i = BaseQ_i * M_i if S_i <= K_i;
   --    q_i = BaseQ_i otherwise.
   function Period_Quantity
     (Live           : Boolean;
      Knocked_Out    : Boolean;
      Base_Q         : Amount;
      Multiplier     : Multiplier_Value;
      Settlement     : Price;
      Strike         : Price) return Amount
   is
     (if (not Live) or Knocked_Out then 0
      elsif Settlement <= Strike then Base_Q * Multiplier
      else Base_Q)
   with
     Pre =>
       Nonnegative (Base_Q)
       and Valid_Multiplier (Multiplier)
       and Positive (Settlement)
       and Nonnegative (Strike);

   --  #20: CumQ_{i+1} = CumQ_i + q_i.
   function Next_Cum_Q
     (Cum_Q : Amount;
      Q     : Amount) return Amount
   is (Cum_Q + Q)
   with
     Pre => Nonnegative (Cum_Q) and Nonnegative (Q);

   --  #20: CashScaled_{i+1} = CashScaled_i + q_i * K_i.
   function Next_Cash_Scaled
     (Cash_Scaled : Amount;
      Q           : Amount;
      Strike      : Price) return Amount
   is (Cash_Scaled + Q * Strike)
   with
     Pre =>
       Nonnegative (Cash_Scaled)
       and Nonnegative (Q)
       and Nonnegative (Strike);

   --  #20 accumulator: Q_{i+1} = Q_i - q_i.
   function Next_Accumulator_Collateral
     (Collateral_Sats : Amount;
      Q               : Amount) return Amount
   is (Collateral_Sats - Q)
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Q)
            and Q <= Collateral_Sats;

   --  #20 decumulator: Inventory_{i+1} = Inventory_i - q_i.
   function Next_Decumulator_Inventory
     (Inventory_Sats : Amount;
      Q              : Amount) return Amount
   is (Inventory_Sats - Q)
   with
     Pre => Nonnegative (Inventory_Sats) and Nonnegative (Q)
            and Q <= Inventory_Sats;

   --  #20 decumulator: CashEscrow_{i+1} = CashEscrow_i - q_i * K_i.
   function Next_Cash_Escrow_Scaled
     (Cash_Escrow_Scaled : Amount;
      Q                  : Amount;
      Strike             : Price) return Amount
   is (Cash_Escrow_Scaled - Q * Strike)
   with
     Pre =>
       Nonnegative (Cash_Escrow_Scaled)
       and Nonnegative (Q)
       and Nonnegative (Strike)
       and Q * Strike <= Cash_Escrow_Scaled;

   function Two_Period_Cum_Q
     (Cum_0 : Amount;
      Q_0   : Amount;
      Q_1   : Amount) return Amount
   is (Next_Cum_Q (Next_Cum_Q (Cum_0, Q_0), Q_1))
   with
     Pre => Nonnegative (Cum_0) and Nonnegative (Q_0) and Nonnegative (Q_1);

   function Two_Period_Cash_Scaled
     (Cash_0 : Amount;
      Q_0    : Amount;
      K_0    : Price;
      Q_1    : Amount;
      K_1    : Price) return Amount
   is (Next_Cash_Scaled (Next_Cash_Scaled (Cash_0, Q_0, K_0), Q_1, K_1))
   with
     Pre =>
       Nonnegative (Cash_0)
       and Nonnegative (Q_0)
       and Nonnegative (K_0)
       and Nonnegative (Q_1)
       and Nonnegative (K_1);

   --  #20 floor witness for CashCents = floor(CashScaled / SAT).
   function Valid_Floor_Cents
     (Cash_Scaled : Amount;
      Cash_Cents  : Amount) return Boolean
   is
     (Cash_Cents * SAT <= Cash_Scaled
      and then Cash_Scaled < (Cash_Cents + 1) * SAT)
   with
     Pre => Nonnegative (Cash_Scaled) and Nonnegative (Cash_Cents);

   --  #20 ceiling witness for conservative cash rounding.
   function Valid_Ceil_Cents
     (Cash_Scaled : Amount;
      Cash_Cents  : Amount) return Boolean
   is
     (Cash_Cents * SAT >= Cash_Scaled
      and then
        (Cash_Cents = 0 or else (Cash_Cents - 1) * SAT < Cash_Scaled))
   with
     Pre => Nonnegative (Cash_Scaled) and Nonnegative (Cash_Cents);

   procedure Prove_Branch_Coverage_Disjointness
     (Settlement : Price;
      Barrier    : Price;
      Strike     : Price)
   with
     Global => null,
     Pre =>
       Positive (Settlement)
       and Nonnegative (Barrier)
       and Nonnegative (Strike),
     Post =>
       (Knock_Out (Settlement, Barrier)
        or Multiplied_Quantity_Branch (Settlement, Barrier, Strike)
        or Base_Quantity_Branch (Settlement, Barrier, Strike))
       and not
         (Knock_Out (Settlement, Barrier)
          and Multiplied_Quantity_Branch (Settlement, Barrier, Strike))
       and not
         (Knock_Out (Settlement, Barrier)
          and Base_Quantity_Branch (Settlement, Barrier, Strike))
       and not
         (Multiplied_Quantity_Branch (Settlement, Barrier, Strike)
          and Base_Quantity_Branch (Settlement, Barrier, Strike));

   procedure Prove_Live_State_Absorption
     (Live        : Boolean;
      Knocked_Out : Boolean)
   with
     Global => null,
     Pre => not Live,
     Post => not Next_Live (Live, Knocked_Out);

   procedure Prove_Continuation_Requires_Live_No_Knockout
     (Live        : Boolean;
      Knocked_Out : Boolean)
   with
     Global => null,
     Pre => Next_Live (Live, Knocked_Out),
     Post => Live and not Knocked_Out;

   procedure Prove_Period_Quantity_Zero_When_Terminal
     (Live        : Boolean;
      Knocked_Out : Boolean;
      Base_Q      : Amount;
      Multiplier  : Multiplier_Value;
      Settlement  : Price;
      Strike      : Price)
   with
     Global => null,
     Pre =>
       ((not Live) or Knocked_Out)
       and Nonnegative (Base_Q)
       and Valid_Multiplier (Multiplier)
       and Positive (Settlement)
       and Nonnegative (Strike),
     Post =>
       Period_Quantity
         (Live, Knocked_Out, Base_Q, Multiplier, Settlement, Strike)
       = 0;

   procedure Prove_Live_Settlement_Quantity_Bounds
     (Base_Q      : Amount;
      Multiplier  : Multiplier_Value;
      Settlement  : Price;
      Strike      : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Base_Q)
       and Valid_Multiplier (Multiplier)
       and Positive (Settlement)
       and Nonnegative (Strike),
     Post =>
       Period_Quantity
         (True, False, Base_Q, Multiplier, Settlement, Strike)
       >= Base_Q
       and Period_Quantity
         (True, False, Base_Q, Multiplier, Settlement, Strike)
       <= Base_Q * Multiplier;

   procedure Prove_Cumulative_Quantity_Update_Exact
     (Cum_Q : Amount;
      Q     : Amount)
   with
     Global => null,
     Pre => Nonnegative (Cum_Q) and Nonnegative (Q),
     Post =>
       Next_Cum_Q (Cum_Q, Q) = Cum_Q + Q
       and Next_Cum_Q (Cum_Q, Q) - Cum_Q = Q;

   procedure Prove_Cumulative_Cash_Update_Exact
     (Cash_Scaled : Amount;
      Q           : Amount;
      Strike      : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Cash_Scaled)
       and Nonnegative (Q)
       and Nonnegative (Strike),
     Post =>
       Next_Cash_Scaled (Cash_Scaled, Q, Strike)
       = Cash_Scaled + Q * Strike
       and Next_Cash_Scaled (Cash_Scaled, Q, Strike) - Cash_Scaled
         = Q * Strike;

   procedure Prove_Accumulator_BTC_Conservation
     (Collateral_Sats : Amount;
      Q               : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Q)
            and Q <= Collateral_Sats,
     Post =>
       Next_Accumulator_Collateral (Collateral_Sats, Q) >= 0
       and Next_Accumulator_Collateral (Collateral_Sats, Q) + Q
         = Collateral_Sats;

   procedure Prove_Decumulator_BTC_Conservation
     (Inventory_Sats : Amount;
      Q              : Amount)
   with
     Global => null,
     Pre => Nonnegative (Inventory_Sats) and Nonnegative (Q)
            and Q <= Inventory_Sats,
     Post =>
       Next_Decumulator_Inventory (Inventory_Sats, Q) >= 0
       and Next_Decumulator_Inventory (Inventory_Sats, Q) + Q
         = Inventory_Sats;

   procedure Prove_Decumulator_Cash_Escrow_Conservation
     (Cash_Escrow_Scaled : Amount;
      Q                  : Amount;
      Strike             : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Cash_Escrow_Scaled)
       and Nonnegative (Q)
       and Nonnegative (Strike)
       and Q * Strike <= Cash_Escrow_Scaled,
     Post =>
       Next_Cash_Escrow_Scaled (Cash_Escrow_Scaled, Q, Strike) >= 0
       and Next_Cash_Escrow_Scaled (Cash_Escrow_Scaled, Q, Strike)
         + Q * Strike = Cash_Escrow_Scaled;

   procedure Prove_Knockout_Stops_Future_Accumulation
     (Cum_Q       : Amount;
      Cash_Scaled : Amount;
      Base_Q      : Amount;
      Multiplier  : Multiplier_Value;
      Settlement  : Price;
      Strike      : Price)
   with
     Global => null,
     Pre =>
       Nonnegative (Cum_Q)
       and Nonnegative (Cash_Scaled)
       and Nonnegative (Base_Q)
       and Valid_Multiplier (Multiplier)
       and Positive (Settlement)
       and Nonnegative (Strike),
     Post =>
       Period_Quantity
         (False, False, Base_Q, Multiplier, Settlement, Strike)
       = 0
       and Next_Cum_Q
         (Cum_Q,
          Period_Quantity
            (False, False, Base_Q, Multiplier, Settlement, Strike))
       = Cum_Q
       and Next_Cash_Scaled
         (Cash_Scaled,
          Period_Quantity
            (False, False, Base_Q, Multiplier, Settlement, Strike),
          Strike)
       = Cash_Scaled;

   procedure Prove_Two_Period_Quantity_Exact_And_Bounded
     (Cum_0  : Amount;
      Q_0    : Amount;
      Q_1    : Amount;
      Base_0 : Amount;
      M_0    : Multiplier_Value;
      Base_1 : Amount;
      M_1    : Multiplier_Value)
   with
     Global => null,
     Pre =>
       Nonnegative (Cum_0)
       and Nonnegative (Q_0)
       and Nonnegative (Q_1)
       and Nonnegative (Base_0)
       and Valid_Multiplier (M_0)
       and Nonnegative (Base_1)
       and Valid_Multiplier (M_1)
       and Q_0 <= Base_0 * M_0
       and Q_1 <= Base_1 * M_1,
     Post =>
       Two_Period_Cum_Q (Cum_0, Q_0, Q_1) = Cum_0 + Q_0 + Q_1
       and Two_Period_Cum_Q (Cum_0, Q_0, Q_1)
         <= Cum_0 + Base_0 * M_0 + Base_1 * M_1;

   procedure Prove_Two_Period_Cash_Exact_And_Bounded
     (Cash_0 : Amount;
      Q_0    : Amount;
      K_0    : Price;
      Q_1    : Amount;
      K_1    : Price;
      Base_0 : Amount;
      M_0    : Multiplier_Value;
      Base_1 : Amount;
      M_1    : Multiplier_Value)
   with
     Global => null,
     Pre =>
       Nonnegative (Cash_0)
       and Nonnegative (Q_0)
       and Nonnegative (K_0)
       and Nonnegative (Q_1)
       and Nonnegative (K_1)
       and Nonnegative (Base_0)
       and Valid_Multiplier (M_0)
       and Nonnegative (Base_1)
       and Valid_Multiplier (M_1)
       and Q_0 <= Base_0 * M_0
       and Q_1 <= Base_1 * M_1,
     Post =>
       Two_Period_Cash_Scaled (Cash_0, Q_0, K_0, Q_1, K_1)
       = Cash_0 + Q_0 * K_0 + Q_1 * K_1
       and Two_Period_Cash_Scaled (Cash_0, Q_0, K_0, Q_1, K_1)
         <= Cash_0 + Base_0 * M_0 * K_0 + Base_1 * M_1 * K_1;

   procedure Prove_Floor_Cash_Rounding_Bound
     (Cash_Scaled : Amount;
      Cash_Cents  : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Cash_Scaled)
       and then Nonnegative (Cash_Cents)
       and then Valid_Floor_Cents (Cash_Scaled, Cash_Cents),
     Post =>
       Cash_Cents * SAT <= Cash_Scaled
       and Cash_Scaled - Cash_Cents * SAT >= 0
       and Cash_Scaled - Cash_Cents * SAT < SAT;

   procedure Prove_Ceil_Cash_Rounding_Bound_Positive
     (Cash_Scaled : Amount;
      Cash_Cents  : Amount)
   with
     Global => null,
     Pre =>
       Positive (Cash_Scaled)
       and then Nonnegative (Cash_Cents)
       and then Valid_Ceil_Cents (Cash_Scaled, Cash_Cents),
     Post =>
       Cash_Cents * SAT >= Cash_Scaled
       and Cash_Cents * SAT - Cash_Scaled >= 0
       and Cash_Cents * SAT - Cash_Scaled < SAT;

   procedure Prove_Ceil_Cash_Rounding_Bound_Zero
     (Cash_Scaled : Amount;
      Cash_Cents  : Amount)
   with
     Global => null,
     Pre =>
       Cash_Scaled = 0
       and then Nonnegative (Cash_Cents)
       and then Valid_Ceil_Cents (Cash_Scaled, Cash_Cents),
     Post =>
       Cash_Cents = 0
       and Cash_Cents * SAT - Cash_Scaled = 0;
end Accumulators_Decumulators_Algebra;
