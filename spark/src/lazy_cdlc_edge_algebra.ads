pragma SPARK_Mode (On);

package Lazy_Cdlc_Edge_Algebra with
  Ghost
is
   Modulus : constant := 97;

   type Element is mod Modulus;

   subtype Scalar is Element;
   subtype Point is Element;

   G : constant Point := 1;

   type Local_Edge is record
      R_Star        : Point;
      Public_Key    : Point;
      Challenge     : Scalar;
      Adaptor       : Scalar;
      Adaptor_Point : Point;
      Hidden        : Scalar;
   end record;

   type Schedule is record
      Edge          : Local_Edge;
      Future_Node_A : Element;
      Future_Node_B : Element;
   end record;

   function Point_Of (X : Scalar) return Point is (X * G);

   function Challenge_Point
     (Challenge  : Scalar;
      Public_Key : Point) return Point
   is (Challenge * Public_Key);

   function Complete
     (Adaptor : Scalar;
      Hidden  : Scalar) return Scalar
   is (Adaptor + Hidden);

   function Verify_Adaptor (Edge : Local_Edge) return Boolean is
     (Point_Of (Edge.Adaptor) =
        Edge.R_Star - Edge.Adaptor_Point
        + Challenge_Point (Edge.Challenge, Edge.Public_Key));

   function Verify_Completed
     (Completed : Scalar;
      Edge      : Local_Edge) return Boolean
   is
     (Point_Of (Completed) =
        Edge.R_Star + Challenge_Point (Edge.Challenge, Edge.Public_Key));

   function Completed_Signature (S : Schedule) return Scalar is
     (Complete (S.Edge.Adaptor, S.Edge.Hidden));

   function Completed_Verifies (S : Schedule) return Boolean is
     (Verify_Completed (Completed_Signature (S), S.Edge));

   procedure Prove_Sum3_Rotates (A, B, C : Element)
   with
     Ghost,
     Global => null,
     Post => (A + B) + C = (A + C) + B;

   procedure Prove_Add_Cancel_Left (A, B, C : Element)
   with
     Ghost,
     Global => null,
     Pre => B /= C,
     Post => A + B /= A + C;

   procedure Prove_Correct_Scalar_Completes
     (Edge : Local_Edge)
   with
     Global => null,
     Pre =>
       Verify_Adaptor (Edge)
       and Edge.Adaptor_Point = Point_Of (Edge.Hidden),
     Post => Verify_Completed (Complete (Edge.Adaptor, Edge.Hidden), Edge);

   procedure Prove_Wrong_Scalar_Rejected
     (Edge         : Local_Edge;
      Wrong_Hidden : Scalar)
   with
     Global => null,
     Pre =>
       Verify_Adaptor (Edge)
       and Edge.Adaptor_Point = Point_Of (Edge.Hidden)
       and Point_Of (Wrong_Hidden) /= Edge.Adaptor_Point,
     Post =>
       not Verify_Completed (Complete (Edge.Adaptor, Wrong_Hidden), Edge);

   procedure Prove_Materialization_Independence
     (Left  : Schedule;
      Right : Schedule)
   with
     Global => null,
     Pre => Left.Edge = Right.Edge,
     Post =>
       Completed_Signature (Left) = Completed_Signature (Right)
       and Completed_Verifies (Left) = Completed_Verifies (Right);
end Lazy_Cdlc_Edge_Algebra;
