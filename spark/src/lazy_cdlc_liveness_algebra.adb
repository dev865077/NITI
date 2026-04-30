pragma SPARK_Mode (On);

package body Lazy_Cdlc_Liveness_Algebra is
   procedure Prove_Available_Implies_Prepared
     (Prepared     : Boolean;
      Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta) is
   begin
      null;
   end Prove_Available_Implies_Prepared;

   procedure Prove_Available_Implies_Timing_OK
     (Prepared     : Boolean;
      Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta) is
   begin
      null;
   end Prove_Available_Implies_Timing_OK;

   procedure Prove_Unprepared_Selects_Fallback
     (Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta) is
   begin
      null;
   end Prove_Unprepared_Selects_Fallback;

   procedure Prove_Timing_Failure_Selects_Fallback
     (Prepared     : Boolean;
      Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta) is
   begin
      null;
   end Prove_Timing_Failure_Selects_Fallback;

   procedure Prove_Branch_Selection_Disjoint_And_Complete
     (Prepared     : Boolean;
      Tau_Announce : Time_Value;
      Tau_Resolve  : Time_Value;
      Delta_Prep   : Time_Delta;
      Delta_Margin : Time_Delta) is
   begin
      null;
   end Prove_Branch_Selection_Disjoint_And_Complete;

   procedure Prove_Window_Live_Implies_All_Timing_Gates
     (Prepared0 : Boolean;
      Prepared1 : Boolean;
      Prepared2 : Boolean;
      Timing0   : Boolean;
      Timing1   : Boolean;
      Timing2   : Boolean) is
   begin
      null;
   end Prove_Window_Live_Implies_All_Timing_Gates;
end Lazy_Cdlc_Liveness_Algebra;
