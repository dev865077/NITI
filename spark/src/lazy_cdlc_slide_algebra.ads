pragma SPARK_Mode (On);

package Lazy_Cdlc_Slide_Algebra with
  Ghost
is
   type Slide_Branch is (Continue, Fallback);

   function Child_Eligible
     (Current_Window_Valid : Boolean;
      Selected_Edge_Live   : Boolean;
      Selected_Prepared    : Boolean) return Boolean
   is (Current_Window_Valid and Selected_Edge_Live and Selected_Prepared);

   function Next_Window_Valid
     (Current_Window_Valid : Boolean;
      Selected_Edge_Live   : Boolean;
      Selected_Prepared    : Boolean;
      Boundary_Prepared    : Boolean) return Boolean
   is
     (Child_Eligible
        (Current_Window_Valid, Selected_Edge_Live, Selected_Prepared)
      and Boundary_Prepared);

   function Select_Slide_Branch
     (Current_Window_Valid : Boolean;
      Selected_Edge_Live   : Boolean;
      Selected_Prepared    : Boolean;
      Boundary_Prepared    : Boolean) return Slide_Branch
   is
     (if Next_Window_Valid
           (Current_Window_Valid,
            Selected_Edge_Live,
            Selected_Prepared,
            Boundary_Prepared)
      then Continue
      else Fallback);

   procedure Prove_Selected_Prepared_Edge_Makes_Child_Eligible
     (Current_Window_Valid : Boolean;
      Selected_Edge_Live   : Boolean;
      Selected_Prepared    : Boolean)
   with
     Global => null,
     Pre =>
       Current_Window_Valid
       and Selected_Edge_Live
       and Selected_Prepared,
     Post =>
       Child_Eligible
         (Current_Window_Valid, Selected_Edge_Live, Selected_Prepared);

   procedure Prove_Boundary_Preparation_Preserves_Window
     (Current_Window_Valid : Boolean;
      Selected_Edge_Live   : Boolean;
      Selected_Prepared    : Boolean;
      Boundary_Prepared    : Boolean)
   with
     Global => null,
     Pre =>
       Current_Window_Valid
       and Selected_Edge_Live
       and Selected_Prepared
       and Boundary_Prepared,
     Post =>
       Next_Window_Valid
         (Current_Window_Valid,
          Selected_Edge_Live,
          Selected_Prepared,
          Boundary_Prepared);

   procedure Prove_Missing_Boundary_Selects_Fallback
     (Current_Window_Valid : Boolean;
      Selected_Edge_Live   : Boolean;
      Selected_Prepared    : Boolean)
   with
     Global => null,
     Post =>
       Select_Slide_Branch
         (Current_Window_Valid,
          Selected_Edge_Live,
          Selected_Prepared,
          Boundary_Prepared => False)
       = Fallback;

   procedure Prove_Unprepared_Selected_Edge_Selects_Fallback
     (Current_Window_Valid : Boolean;
      Selected_Edge_Live   : Boolean;
      Boundary_Prepared    : Boolean)
   with
     Global => null,
     Post =>
       Select_Slide_Branch
         (Current_Window_Valid,
          Selected_Edge_Live,
          Selected_Prepared => False,
          Boundary_Prepared => Boundary_Prepared)
       = Fallback;

   procedure Prove_Terminal_Selected_Edge_Selects_Fallback
     (Current_Window_Valid : Boolean;
      Selected_Prepared    : Boolean;
      Boundary_Prepared    : Boolean)
   with
     Global => null,
     Post =>
       Select_Slide_Branch
         (Current_Window_Valid,
          Selected_Edge_Live => False,
          Selected_Prepared  => Selected_Prepared,
          Boundary_Prepared  => Boundary_Prepared)
       = Fallback;

   procedure Prove_Slide_Branches_Are_Disjoint_And_Complete
     (Current_Window_Valid : Boolean;
      Selected_Edge_Live   : Boolean;
      Selected_Prepared    : Boolean;
      Boundary_Prepared    : Boolean)
   with
     Global => null,
     Post =>
       (Select_Slide_Branch
          (Current_Window_Valid,
           Selected_Edge_Live,
           Selected_Prepared,
           Boundary_Prepared)
        = Continue)
       /=
       (Select_Slide_Branch
          (Current_Window_Valid,
           Selected_Edge_Live,
           Selected_Prepared,
           Boundary_Prepared)
        = Fallback);
end Lazy_Cdlc_Slide_Algebra;
