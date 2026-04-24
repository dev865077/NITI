with Ada.Strings.Unbounded;

package Niti_Manifest is
   Max_Nodes : constant := 32;
   Max_Edges : constant := 64;

   subtype Satoshi is Long_Long_Integer range 0 .. Long_Long_Integer'Last;
   subtype Height is Natural;

   type Node is record
      Id             : Ada.Strings.Unbounded.Unbounded_String;
      Collateral_Sat : Satoshi := 0;
      Refund_Height  : Height := 0;
   end record;

   type Edge is record
      From             : Ada.Strings.Unbounded.Unbounded_String;
      Outcome          : Ada.Strings.Unbounded.Unbounded_String;
      To               : Ada.Strings.Unbounded.Unbounded_String;
      Bridge_Value_Sat : Satoshi := 0;
      Timeout_Height   : Height := 0;
   end record;

   type Node_Array is array (Positive range 1 .. Max_Nodes) of Node;
   type Edge_Array is array (Positive range 1 .. Max_Edges) of Edge;

   type Manifest is record
      Version    : Natural := 0;
      Network    : Ada.Strings.Unbounded.Unbounded_String;
      Node_Count : Natural := 0;
      Nodes      : Node_Array;
      Edge_Count : Natural := 0;
      Edges      : Edge_Array;
   end record;

   function Load (Path : String) return Manifest;

   procedure Validate
     (M       : Manifest;
      Ok      : out Boolean;
      Message : out Ada.Strings.Unbounded.Unbounded_String);
end Niti_Manifest;
