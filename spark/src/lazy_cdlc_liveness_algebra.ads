pragma SPARK_Mode (On);

package Lazy_Cdlc_Liveness_Algebra with
  Ghost
is
   type Time_Value is range 0 .. 1_000_000;
   subtype Time_Delta is Time_Value range 0 .. 100_000;

   type Liveness_Branch is (Continue, Fallback);

   function Ready_Time
     (Tau_Announce : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta) return Time_Value
   is (Tau_Announce + Delta_Prep + Delta_Margin)
   with
     Pre => Tau_Announce <= 800_000;

   function Timing_OK
     (Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta) return Boolean
   is (Ready_Time (Tau_Announce, Delta_Prep, Delta_Margin) < Tau_Resolve)
   with
     Pre => Tau_Announce <= 800_000;

   function Continuation_Available
     (Prepared     : Boolean;
      Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta) return Boolean
   is
     (Prepared
      and Timing_OK (Tau_Announce, Tau_Resolve, Delta_Prep, Delta_Margin))
   with
     Pre => Tau_Announce <= 800_000;

   function Select_Branch
     (Prepared     : Boolean;
      Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta) return Liveness_Branch
   is
     (if Continuation_Available
           (Prepared, Tau_Announce, Tau_Resolve, Delta_Prep, Delta_Margin)
      then Continue
      else Fallback)
   with
     Pre => Tau_Announce <= 800_000;

   function Three_Step_Window_Live
     (Prepared0 : Boolean;
      Prepared1 : Boolean;
      Prepared2 : Boolean;
      Timing0   : Boolean;
      Timing1   : Boolean;
      Timing2   : Boolean) return Boolean
   is (Prepared0 and Prepared1 and Prepared2 and Timing0 and Timing1 and Timing2);

   procedure Prove_Available_Implies_Prepared
     (Prepared     : Boolean;
      Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta)
   with
     Global => null,
     Pre =>
       Tau_Announce <= 800_000
       and then Continuation_Available
             (Prepared, Tau_Announce, Tau_Resolve, Delta_Prep, Delta_Margin),
     Post => Prepared;

   procedure Prove_Available_Implies_Timing_OK
     (Prepared     : Boolean;
      Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta)
   with
     Global => null,
     Pre =>
       Tau_Announce <= 800_000
       and then Continuation_Available
             (Prepared, Tau_Announce, Tau_Resolve, Delta_Prep, Delta_Margin),
     Post => Timing_OK (Tau_Announce, Tau_Resolve, Delta_Prep, Delta_Margin);

   procedure Prove_Unprepared_Selects_Fallback
     (Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta)
   with
     Global => null,
     Pre => Tau_Announce <= 800_000,
     Post =>
       Select_Branch
         (Prepared     => False,
          Tau_Announce => Tau_Announce,
          Tau_Resolve  => Tau_Resolve,
          Delta_Prep   => Delta_Prep,
          Delta_Margin => Delta_Margin)
       = Fallback;

   procedure Prove_Timing_Failure_Selects_Fallback
     (Prepared     : Boolean;
      Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta)
   with
     Global => null,
     Pre =>
       Tau_Announce <= 800_000
       and then not Timing_OK
         (Tau_Announce, Tau_Resolve, Delta_Prep, Delta_Margin),
     Post =>
       Select_Branch
         (Prepared, Tau_Announce, Tau_Resolve, Delta_Prep, Delta_Margin)
       = Fallback;

   procedure Prove_Branch_Selection_Disjoint_And_Complete
     (Prepared     : Boolean;
      Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta)
   with
     Global => null,
     Pre => Tau_Announce <= 800_000,
     Post =>
       (Select_Branch
          (Prepared, Tau_Announce, Tau_Resolve, Delta_Prep, Delta_Margin)
        = Continue)
       /=
       (Select_Branch
          (Prepared, Tau_Announce, Tau_Resolve, Delta_Prep, Delta_Margin)
        = Fallback);

   procedure Prove_Window_Live_Implies_All_Timing_Gates
     (Prepared0 : Boolean;
      Prepared1 : Boolean;
      Prepared2 : Boolean;
      Timing0   : Boolean;
      Timing1   : Boolean;
      Timing2   : Boolean)
   with
     Global => null,
     Pre =>
       Three_Step_Window_Live
         (Prepared0, Prepared1, Prepared2, Timing0, Timing1, Timing2),
     Post => Timing0 and Timing1 and Timing2;
end Lazy_Cdlc_Liveness_Algebra;
