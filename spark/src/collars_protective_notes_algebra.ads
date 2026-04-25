pragma SPARK_Mode (On);

with SPARK.Big_Integers;
use SPARK.Big_Integers;

package Collars_Protective_Notes_Algebra with
  Ghost
is
   subtype Amount is Valid_Big_Integer;
   subtype Price is Valid_Big_Integer;
   subtype Ratio_Component is Valid_Big_Integer;

   SAT : constant Amount := 100_000_000;

   function Nonnegative (X : Amount) return Boolean is (X >= 0);
   function Positive (X : Amount) return Boolean is (X > 0);

   function Min (A, B : Amount) return Amount is
     (if A <= B then A else B)
   with
     Pre => Nonnegative (A) and Nonnegative (B);

   function Max (A, B : Amount) return Amount is
     (if A >= B then A else B)
   with
     Pre => Nonnegative (A) and Nonnegative (B);

   --  #14: Pos(X - Y) = X - Y if X > Y, otherwise 0.
   function Pos_Diff (X, Y : Amount) return Amount is
     (if X > Y then X - Y else 0)
   with
     Pre => Nonnegative (X) and Nonnegative (Y);

   --  #14: CollarPrice(P, K_put, K_call) = Min(Max(P, K_put), K_call).
   function Collar_Price
     (Settlement : Price;
      Put_Strike : Price;
      Call_Strike : Price) return Amount
   is (Min (Max (Settlement, Put_Strike), Call_Strike))
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Put_Strike)
       and Nonnegative (Call_Strike)
       and Put_Strike <= Call_Strike;

   --  #14: ProtectivePutScaled(P) = R * Max(P, K_put) * Alpha_Den.
   function Protective_Put_Scaled
     (Reference_Sats : Amount;
      Settlement     : Price;
      Put_Strike     : Price;
      Alpha_Den      : Ratio_Component) return Amount
   is (Reference_Sats * Max (Settlement, Put_Strike) * Alpha_Den)
   with
     Pre =>
       Nonnegative (Reference_Sats)
       and Positive (Settlement)
       and Nonnegative (Put_Strike)
       and Positive (Alpha_Den);

   --  #14: CollarScaled(P) = R * CollarPrice(P, K_put, K_call) * Alpha_Den.
   function Collar_Scaled
     (Reference_Sats : Amount;
      Settlement     : Price;
      Put_Strike     : Price;
      Call_Strike    : Price;
      Alpha_Den      : Ratio_Component) return Amount
   is
     (Reference_Sats *
      Collar_Price (Settlement, Put_Strike, Call_Strike) *
      Alpha_Den)
   with
     Pre =>
       Nonnegative (Reference_Sats)
       and Positive (Settlement)
       and Nonnegative (Put_Strike)
       and Nonnegative (Call_Strike)
       and Put_Strike <= Call_Strike
       and Positive (Alpha_Den);

   --  #14: CappedUpside(P) = Min(Pos(P - S0), K_call - S0).
   function Capped_Upside
     (Settlement  : Price;
      Initial     : Price;
      Call_Strike : Price) return Amount
   is (Min (Pos_Diff (Settlement, Initial), Call_Strike - Initial))
   with
     Pre =>
       Positive (Settlement)
       and Positive (Initial)
       and Nonnegative (Call_Strike)
       and Call_Strike >= Initial;

   --  #14:
   --    NoteScaled(P) = Principal * B * Alpha_Den
   --      + R * CappedUpside(P) * Alpha_Num.
   function Note_Scaled
     (Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Settlement      : Price;
      Initial         : Price;
      Call_Strike     : Price;
      Alpha_Num       : Ratio_Component;
      Alpha_Den       : Ratio_Component) return Amount
   is
     (Principal_Cents * SAT * Alpha_Den
      + Reference_Sats *
        Capped_Upside (Settlement, Initial, Call_Strike) *
        Alpha_Num)
   with
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Reference_Sats)
       and Positive (Settlement)
       and Positive (Initial)
       and Nonnegative (Call_Strike)
       and Call_Strike >= Initial
       and Nonnegative (Alpha_Num)
       and Positive (Alpha_Den);

   function Put_Floor_Branch
     (Settlement : Price;
      Put_Strike : Price) return Boolean
   is (Settlement < Put_Strike)
   with
     Pre => Positive (Settlement) and Nonnegative (Put_Strike);

   function Put_Spot_Branch
     (Settlement : Price;
      Put_Strike : Price) return Boolean
   is (Settlement >= Put_Strike)
   with
     Pre => Positive (Settlement) and Nonnegative (Put_Strike);

   function Collar_Lower_Branch
     (Settlement : Price;
      Put_Strike : Price) return Boolean
   is (Settlement < Put_Strike)
   with
     Pre => Positive (Settlement) and Nonnegative (Put_Strike);

   function Collar_Middle_Branch
     (Settlement  : Price;
      Put_Strike  : Price;
      Call_Strike : Price) return Boolean
   is (Settlement >= Put_Strike and Settlement <= Call_Strike)
   with
     Pre =>
       Positive (Settlement)
       and Nonnegative (Put_Strike)
       and Nonnegative (Call_Strike)
       and Put_Strike <= Call_Strike;

   function Collar_Upper_Branch
     (Settlement  : Price;
      Call_Strike : Price) return Boolean
   is (Settlement > Call_Strike)
   with
     Pre => Positive (Settlement) and Nonnegative (Call_Strike);

   function Note_Principal_Branch
     (Settlement : Price;
      Initial    : Price) return Boolean
   is (Settlement <= Initial)
   with
     Pre => Positive (Settlement) and Positive (Initial);

   function Note_Participation_Branch
     (Settlement  : Price;
      Initial     : Price;
      Call_Strike : Price) return Boolean
   is (Settlement > Initial and Settlement < Call_Strike)
   with
     Pre =>
       Positive (Settlement)
       and Positive (Initial)
       and Nonnegative (Call_Strike)
       and Call_Strike > Initial;

   function Note_Capped_Branch
     (Settlement  : Price;
      Call_Strike : Price) return Boolean
   is (Settlement >= Call_Strike)
   with
     Pre => Positive (Settlement) and Nonnegative (Call_Strike);

   function Claim_Unit
     (Settlement : Price;
      Alpha_Den  : Ratio_Component) return Amount
   is (Settlement * Alpha_Den)
   with
     Pre => Positive (Settlement) and Positive (Alpha_Den);

   --  #14: ClaimBTC = ceil(PayoffScaled / (P * Alpha_Den)).
   function Valid_Claim_Ceil
     (Payoff_Scaled : Amount;
      Unit          : Amount;
      Claim_Sats    : Amount) return Boolean
   is
     (Claim_Sats * Unit >= Payoff_Scaled
      and then
        (Claim_Sats = 0
         or else (Claim_Sats - 1) * Unit < Payoff_Scaled))
   with
     Pre =>
       Nonnegative (Payoff_Scaled)
       and Positive (Unit)
       and Nonnegative (Claim_Sats);

   function Investor_BTC
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount) return Amount
   is (Min (Collateral_Sats, Claim_Sats))
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Claim_Sats);

   function Structurer_BTC
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount) return Amount
   is (Collateral_Sats - Investor_BTC (Collateral_Sats, Claim_Sats))
   with
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Claim_Sats);

   function Net_Premium
     (Premium_Put_Cents  : Amount;
      Premium_Call_Cents : Amount) return Amount
   is (Premium_Put_Cents - Premium_Call_Cents)
   with
     Pre =>
       Nonnegative (Premium_Put_Cents)
       and Nonnegative (Premium_Call_Cents);

   procedure Prove_Protective_Put_Floor
     (Reference_Sats : Amount;
      Settlement     : Price;
      Put_Strike     : Price;
      Alpha_Den      : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Reference_Sats)
       and Positive (Settlement)
       and Nonnegative (Put_Strike)
       and Positive (Alpha_Den),
     Post =>
       Protective_Put_Scaled
         (Reference_Sats, Settlement, Put_Strike, Alpha_Den)
       >= Reference_Sats * Put_Strike * Alpha_Den;

   procedure Prove_Protective_Put_Continuity
     (Reference_Sats : Amount;
      Strike         : Price;
      Alpha_Den      : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Reference_Sats)
       and Positive (Strike)
       and Positive (Alpha_Den),
     Post =>
       Protective_Put_Scaled
         (Reference_Sats, Strike, Strike, Alpha_Den)
       = Reference_Sats * Strike * Alpha_Den;

   procedure Prove_Collar_Branch_Coverage_Disjointness
     (Settlement  : Price;
      Put_Strike  : Price;
      Call_Strike : Price)
   with
     Global => null,
     Pre =>
       Positive (Settlement)
       and Nonnegative (Put_Strike)
       and Nonnegative (Call_Strike)
       and Put_Strike <= Call_Strike,
     Post =>
       (Collar_Lower_Branch (Settlement, Put_Strike)
        or Collar_Middle_Branch (Settlement, Put_Strike, Call_Strike)
        or Collar_Upper_Branch (Settlement, Call_Strike))
       and not
         (Collar_Lower_Branch (Settlement, Put_Strike)
          and Collar_Middle_Branch (Settlement, Put_Strike, Call_Strike))
       and not
         (Collar_Lower_Branch (Settlement, Put_Strike)
          and Collar_Upper_Branch (Settlement, Call_Strike))
       and not
         (Collar_Middle_Branch (Settlement, Put_Strike, Call_Strike)
          and Collar_Upper_Branch (Settlement, Call_Strike));

   procedure Prove_Collar_Floor_And_Cap
     (Reference_Sats : Amount;
      Settlement     : Price;
      Put_Strike     : Price;
      Call_Strike    : Price;
      Alpha_Den      : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Reference_Sats)
       and Positive (Settlement)
       and Nonnegative (Put_Strike)
       and Nonnegative (Call_Strike)
       and Put_Strike <= Call_Strike
       and Positive (Alpha_Den),
     Post =>
       Reference_Sats * Put_Strike * Alpha_Den
       <= Collar_Scaled
            (Reference_Sats,
             Settlement,
             Put_Strike,
             Call_Strike,
             Alpha_Den)
       and
       Collar_Scaled
         (Reference_Sats, Settlement, Put_Strike, Call_Strike, Alpha_Den)
       <= Reference_Sats * Call_Strike * Alpha_Den;

   procedure Prove_Collar_Continuity
     (Reference_Sats : Amount;
      Put_Strike     : Price;
      Call_Strike    : Price;
      Alpha_Den      : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Reference_Sats)
       and Positive (Put_Strike)
       and Positive (Call_Strike)
       and Put_Strike <= Call_Strike
       and Positive (Alpha_Den),
     Post =>
       Collar_Scaled
         (Reference_Sats, Put_Strike, Put_Strike, Call_Strike, Alpha_Den)
       = Reference_Sats * Put_Strike * Alpha_Den
       and
       Collar_Scaled
         (Reference_Sats, Call_Strike, Put_Strike, Call_Strike, Alpha_Den)
       = Reference_Sats * Call_Strike * Alpha_Den;

   procedure Prove_Note_Principal_Protection
     (Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Settlement      : Price;
      Initial         : Price;
      Call_Strike     : Price;
      Alpha_Num       : Ratio_Component;
      Alpha_Den       : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Reference_Sats)
       and Positive (Settlement)
       and Positive (Initial)
       and Nonnegative (Call_Strike)
       and Call_Strike >= Initial
       and Nonnegative (Alpha_Num)
       and Positive (Alpha_Den),
     Post =>
       Note_Scaled
         (Principal_Cents,
          Reference_Sats,
          Settlement,
          Initial,
          Call_Strike,
          Alpha_Num,
          Alpha_Den)
       >= Principal_Cents * SAT * Alpha_Den;

   procedure Prove_Note_Upside_Cap
     (Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Settlement      : Price;
      Initial         : Price;
      Call_Strike     : Price;
      Alpha_Num       : Ratio_Component;
      Alpha_Den       : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Reference_Sats)
       and Positive (Settlement)
       and Positive (Initial)
       and Nonnegative (Call_Strike)
       and Call_Strike >= Initial
       and Nonnegative (Alpha_Num)
       and Positive (Alpha_Den),
     Post =>
       Note_Scaled
         (Principal_Cents,
          Reference_Sats,
          Settlement,
          Initial,
          Call_Strike,
          Alpha_Num,
          Alpha_Den)
       <= Principal_Cents * SAT * Alpha_Den
          + Reference_Sats * (Call_Strike - Initial) * Alpha_Num;

   procedure Prove_Note_Branch_Coverage_Disjointness
     (Settlement  : Price;
      Initial     : Price;
      Call_Strike : Price)
   with
     Global => null,
     Pre =>
       Positive (Settlement)
       and Positive (Initial)
       and Nonnegative (Call_Strike)
       and Call_Strike > Initial,
     Post =>
       (Note_Principal_Branch (Settlement, Initial)
        or Note_Participation_Branch (Settlement, Initial, Call_Strike)
        or Note_Capped_Branch (Settlement, Call_Strike))
       and not
         (Note_Principal_Branch (Settlement, Initial)
          and Note_Participation_Branch
            (Settlement, Initial, Call_Strike))
       and not
         (Note_Principal_Branch (Settlement, Initial)
          and Note_Capped_Branch (Settlement, Call_Strike))
       and not
         (Note_Participation_Branch (Settlement, Initial, Call_Strike)
          and Note_Capped_Branch (Settlement, Call_Strike));

   procedure Prove_Note_Continuity
     (Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Initial         : Price;
      Call_Strike     : Price;
      Alpha_Num       : Ratio_Component;
      Alpha_Den       : Ratio_Component)
   with
     Global => null,
     Pre =>
       Nonnegative (Principal_Cents)
       and Nonnegative (Reference_Sats)
       and Positive (Initial)
       and Nonnegative (Call_Strike)
       and Call_Strike >= Initial
       and Nonnegative (Alpha_Num)
       and Positive (Alpha_Den),
     Post =>
       Note_Scaled
         (Principal_Cents,
          Reference_Sats,
          Initial,
          Initial,
          Call_Strike,
          Alpha_Num,
          Alpha_Den)
       = Principal_Cents * SAT * Alpha_Den
       and
       Note_Scaled
         (Principal_Cents,
          Reference_Sats,
          Call_Strike,
          Initial,
          Call_Strike,
          Alpha_Num,
          Alpha_Den)
       =
       Principal_Cents * SAT * Alpha_Den
       + Reference_Sats * (Call_Strike - Initial) * Alpha_Num;

   procedure Prove_Claim_Ceil_Covers
     (Payoff_Scaled : Amount;
      Unit          : Amount;
      Claim_Sats    : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Payoff_Scaled)
       and then Positive (Unit)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil (Payoff_Scaled, Unit, Claim_Sats),
     Post => Claim_Sats * Unit >= Payoff_Scaled;

   procedure Prove_Claim_Rounding_Error
     (Payoff_Scaled : Amount;
      Unit          : Amount;
      Claim_Sats    : Amount)
   with
     Global => null,
     Pre =>
       Positive (Payoff_Scaled)
       and then Positive (Unit)
       and then Nonnegative (Claim_Sats)
       and then Valid_Claim_Ceil (Payoff_Scaled, Unit, Claim_Sats),
     Post =>
       Claim_Sats * Unit - Payoff_Scaled >= 0
       and Claim_Sats * Unit - Payoff_Scaled < Unit;

   procedure Prove_BTC_Conservation
     (Collateral_Sats : Amount;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre => Nonnegative (Collateral_Sats) and Nonnegative (Claim_Sats),
     Post =>
       Investor_BTC (Collateral_Sats, Claim_Sats) >= 0
       and Investor_BTC (Collateral_Sats, Claim_Sats) <= Collateral_Sats
       and Structurer_BTC (Collateral_Sats, Claim_Sats) >= 0
       and Structurer_BTC (Collateral_Sats, Claim_Sats) <= Collateral_Sats
       and Investor_BTC (Collateral_Sats, Claim_Sats)
         + Structurer_BTC (Collateral_Sats, Claim_Sats)
         = Collateral_Sats;

   procedure Prove_Sufficient_Collateral_Covers_Payoff
     (Collateral_Sats : Amount;
      Payoff_Scaled   : Amount;
      Unit            : Amount;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Payoff_Scaled)
       and then Positive (Unit)
       and then Nonnegative (Claim_Sats)
       and then Claim_Sats <= Collateral_Sats
       and then Valid_Claim_Ceil (Payoff_Scaled, Unit, Claim_Sats),
     Post =>
       Investor_BTC (Collateral_Sats, Claim_Sats) = Claim_Sats
       and Investor_BTC (Collateral_Sats, Claim_Sats) * Unit
         >= Payoff_Scaled;

   procedure Prove_Principal_Protection_After_BTC_Conversion
     (Collateral_Sats : Amount;
      Principal_Cents : Amount;
      Reference_Sats  : Amount;
      Settlement      : Price;
      Initial         : Price;
      Call_Strike     : Price;
      Alpha_Num       : Ratio_Component;
      Alpha_Den       : Ratio_Component;
      Claim_Sats      : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Collateral_Sats)
       and then Nonnegative (Principal_Cents)
       and then Nonnegative (Reference_Sats)
       and then Positive (Settlement)
       and then Positive (Initial)
       and then Nonnegative (Call_Strike)
       and then Call_Strike >= Initial
       and then Nonnegative (Alpha_Num)
       and then Positive (Alpha_Den)
       and then Nonnegative (Claim_Sats)
       and then Claim_Sats <= Collateral_Sats
       and then Valid_Claim_Ceil
         (Note_Scaled
            (Principal_Cents,
             Reference_Sats,
             Settlement,
             Initial,
             Call_Strike,
             Alpha_Num,
             Alpha_Den),
          Claim_Unit (Settlement, Alpha_Den),
          Claim_Sats),
     Post =>
       Investor_BTC (Collateral_Sats, Claim_Sats)
       * Claim_Unit (Settlement, Alpha_Den)
       >= Principal_Cents * SAT * Alpha_Den;

   procedure Prove_Zero_Cost_Premium
     (Premium_Put_Cents  : Amount;
      Premium_Call_Cents : Amount)
   with
     Global => null,
     Pre =>
       Nonnegative (Premium_Put_Cents)
       and Nonnegative (Premium_Call_Cents)
       and Premium_Put_Cents = Premium_Call_Cents,
     Post => Net_Premium (Premium_Put_Cents, Premium_Call_Cents) = 0;
end Collars_Protective_Notes_Algebra;
