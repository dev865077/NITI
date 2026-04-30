pragma SPARK_Mode (On);

package body Lazy_Cdlc_Edge_Algebra is
   procedure Prove_Sum3_Rotates (A, B, C : Element) is
   begin
      pragma Assert ((A + B) + C = (A + C) + B);
   end Prove_Sum3_Rotates;

   procedure Prove_Add_Cancel_Left (A, B, C : Element) is
   begin
      pragma Assert (B /= C);
      pragma Assert (A + B /= A + C);
   end Prove_Add_Cancel_Left;

   procedure Prove_Correct_Scalar_Completes
     (Edge : Local_Edge) is
      Product : constant Element :=
        Challenge_Point (Edge.Challenge, Edge.Public_Key);
   begin
      Prove_Sum3_Rotates
        (Edge.R_Star - Edge.Adaptor_Point, Product, Edge.Hidden);
      pragma Assert (Point_Of (Edge.Adaptor) =
                       Edge.R_Star - Edge.Adaptor_Point + Product);
      pragma Assert
        (Point_Of (Complete (Edge.Adaptor, Edge.Hidden)) =
           (Edge.R_Star - Edge.Adaptor_Point + Product) + Edge.Hidden);
      pragma Assert
        ((Edge.R_Star - Edge.Adaptor_Point + Product) + Edge.Hidden =
           (Edge.R_Star - Edge.Adaptor_Point + Edge.Hidden) + Product);
      pragma Assert (Edge.Adaptor_Point = Edge.Hidden);
      pragma Assert (Edge.R_Star - Edge.Adaptor_Point + Edge.Hidden =
                       Edge.R_Star);
      pragma Assert
        (Verify_Completed (Complete (Edge.Adaptor, Edge.Hidden), Edge));
   end Prove_Correct_Scalar_Completes;

   procedure Prove_Wrong_Scalar_Rejected
     (Edge         : Local_Edge;
      Wrong_Hidden : Scalar) is
      Product : constant Element :=
        Challenge_Point (Edge.Challenge, Edge.Public_Key);
      Prefix : constant Element :=
        Edge.R_Star - Edge.Adaptor_Point + Product;
   begin
      Prove_Sum3_Rotates
        (Edge.R_Star - Edge.Adaptor_Point, Product, Edge.Hidden);
      Prove_Sum3_Rotates
        (Edge.R_Star - Edge.Adaptor_Point, Product, Wrong_Hidden);
      Prove_Add_Cancel_Left (Prefix, Wrong_Hidden, Edge.Hidden);
      pragma Assert (Point_Of (Edge.Adaptor) = Prefix);
      pragma Assert (Point_Of (Complete (Edge.Adaptor, Wrong_Hidden)) =
                       Prefix + Wrong_Hidden);
      pragma Assert (Point_Of (Complete (Edge.Adaptor, Edge.Hidden)) =
                       Prefix + Edge.Hidden);
      pragma Assert (Prefix + Edge.Hidden =
                       Edge.R_Star + Product);
      pragma Assert (Prefix + Wrong_Hidden /= Edge.R_Star + Product);
      pragma Assert
        (not Verify_Completed (Complete (Edge.Adaptor, Wrong_Hidden), Edge));
   end Prove_Wrong_Scalar_Rejected;

   procedure Prove_Materialization_Independence
     (Left  : Schedule;
      Right : Schedule) is
   begin
      pragma Assert (Left.Edge = Right.Edge);
      pragma Assert (Completed_Signature (Left) = Completed_Signature (Right));
      pragma Assert (Completed_Verifies (Left) = Completed_Verifies (Right));
   end Prove_Materialization_Independence;
end Lazy_Cdlc_Edge_Algebra;
