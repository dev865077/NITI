with Ada.Characters.Latin_1;
with Ada.Strings.Fixed;
with Ada.Text_IO;

package body Niti_Manifest is
   use Ada.Strings.Unbounded;

   function Source_Text (Path : String) return String is
      File : Ada.Text_IO.File_Type;
      Text : Unbounded_String;
   begin
      Ada.Text_IO.Open (File, Ada.Text_IO.In_File, Path);
      while not Ada.Text_IO.End_Of_File (File) loop
         Append (Text, Ada.Text_IO.Get_Line (File));
         Append (Text, Ada.Characters.Latin_1.LF);
      end loop;
      Ada.Text_IO.Close (File);
      return To_String (Text);
   end Source_Text;

   function After_Key (S, Key : String) return Natural is
      Pattern : constant String := '"' & Key & '"' & ":";
      P       : constant Natural := Ada.Strings.Fixed.Index (S, Pattern);
   begin
      if P = 0 then
         raise Constraint_Error with "missing key: " & Key;
      end if;
      return P + Pattern'Length;
   end After_Key;

   function Skip_Spaces (S : String; Pos : Natural) return Natural is
      I : Natural := Pos;
   begin
      while I <= S'Last and then
        (S (I) = ' ' or else S (I) = Ada.Characters.Latin_1.LF)
      loop
         I := I + 1;
      end loop;
      return I;
   end Skip_Spaces;

   function String_Field (S, Key : String) return String is
      Start : Natural := Skip_Spaces (S, After_Key (S, Key));
      Stop  : Natural;
   begin
      if Start > S'Last or else S (Start) /= '"' then
         raise Constraint_Error with "key is not a string: " & Key;
      end if;
      Start := Start + 1;
      Stop := Ada.Strings.Fixed.Index (S, """", Start);
      if Stop = 0 then
         raise Constraint_Error with "unterminated string: " & Key;
      end if;
      return S (Start .. Stop - 1);
   end String_Field;

   function Number_Field (S, Key : String) return Long_Long_Integer is
      Start : constant Natural := Skip_Spaces (S, After_Key (S, Key));
      Stop  : Natural := Start;
   begin
      while Stop <= S'Last and then S (Stop) in '0' .. '9' loop
         Stop := Stop + 1;
      end loop;
      if Stop = Start then
         raise Constraint_Error with "key is not a number: " & Key;
      end if;
      return Long_Long_Integer'Value (S (Start .. Stop - 1));
   end Number_Field;

   function Array_Bounds
     (S   : String;
      Key : String) return Natural
   is
      Start : constant Natural := Skip_Spaces (S, After_Key (S, Key));
      Depth : Natural := 0;
   begin
      if Start > S'Last or else S (Start) /= '[' then
         raise Constraint_Error with "key is not an array: " & Key;
      end if;

      for I in Start .. S'Last loop
         if S (I) = '[' then
            Depth := Depth + 1;
         elsif S (I) = ']' then
            Depth := Depth - 1;
            if Depth = 0 then
               return I;
            end if;
         end if;
      end loop;

      raise Constraint_Error with "unterminated array: " & Key;
   end Array_Bounds;

   function Array_Start (S, Key : String) return Natural is
   begin
      return Skip_Spaces (S, After_Key (S, Key));
   end Array_Start;

   procedure Parse_Nodes (S : String; M : in out Manifest) is
      Start       : constant Natural := Array_Start (S, "nodes");
      Stop        : constant Natural := Array_Bounds (S, "nodes");
      Depth       : Natural := 0;
      Object_From : Natural := 0;
   begin
      for I in Start .. Stop loop
         if S (I) = '{' then
            if Depth = 0 then
               Object_From := I;
            end if;
            Depth := Depth + 1;
         elsif S (I) = '}' then
            Depth := Depth - 1;
            if Depth = 0 then
               if M.Node_Count = Max_Nodes then
                  raise Constraint_Error with "too many nodes";
               end if;
               declare
                  Obj : constant String := S (Object_From .. I);
                  N   : Node;
               begin
                  N.Id := To_Unbounded_String (String_Field (Obj, "id"));
                  N.Collateral_Sat := Satoshi (Number_Field (Obj, "collateral_sat"));
                  N.Refund_Height := Height (Number_Field (Obj, "refund_height"));
                  M.Node_Count := M.Node_Count + 1;
                  M.Nodes (M.Node_Count) := N;
               end;
            end if;
         end if;
      end loop;
   end Parse_Nodes;

   procedure Parse_Edges (S : String; M : in out Manifest) is
      Start       : constant Natural := Array_Start (S, "edges");
      Stop        : constant Natural := Array_Bounds (S, "edges");
      Depth       : Natural := 0;
      Object_From : Natural := 0;
   begin
      for I in Start .. Stop loop
         if S (I) = '{' then
            if Depth = 0 then
               Object_From := I;
            end if;
            Depth := Depth + 1;
         elsif S (I) = '}' then
            Depth := Depth - 1;
            if Depth = 0 then
               if M.Edge_Count = Max_Edges then
                  raise Constraint_Error with "too many edges";
               end if;
               declare
                  Obj : constant String := S (Object_From .. I);
                  E   : Edge;
               begin
                  E.From := To_Unbounded_String (String_Field (Obj, "from"));
                  E.Outcome := To_Unbounded_String (String_Field (Obj, "outcome"));
                  E.To := To_Unbounded_String (String_Field (Obj, "to"));
                  E.Bridge_Value_Sat := Satoshi (Number_Field (Obj, "bridge_value_sat"));
                  E.Timeout_Height := Height (Number_Field (Obj, "timeout_height"));
                  M.Edge_Count := M.Edge_Count + 1;
                  M.Edges (M.Edge_Count) := E;
               end;
            end if;
         end if;
      end loop;
   end Parse_Edges;

   function Load (Path : String) return Manifest is
      S : constant String := Source_Text (Path);
      M : Manifest;
   begin
      M.Version := Natural (Number_Field (S, "version"));
      M.Network := To_Unbounded_String (String_Field (S, "network"));
      Parse_Nodes (S, M);
      Parse_Edges (S, M);
      return M;
   end Load;

   function Is_Valid_Id (Value : String) return Boolean is
   begin
      if Value'Length = 0 or else Value'Length > 48 then
         return False;
      end if;

      for C of Value loop
         if not (C in 'a' .. 'z'
                 or else C in 'A' .. 'Z'
                 or else C in '0' .. '9'
                 or else C = '_'
                 or else C = '-') then
            return False;
         end if;
      end loop;
      return True;
   end Is_Valid_Id;

   function Node_Index (M : Manifest; Id : String) return Natural is
   begin
      for I in 1 .. M.Node_Count loop
         if To_String (M.Nodes (I).Id) = Id then
            return I;
         end if;
      end loop;
      return 0;
   end Node_Index;

   procedure Fail
     (Ok      : out Boolean;
      Message : out Unbounded_String;
      Text    : String)
   is
   begin
      Ok := False;
      Message := To_Unbounded_String (Text);
   end Fail;

   procedure Validate
     (M       : Manifest;
      Ok      : out Boolean;
      Message : out Unbounded_String)
   is
      Network : constant String := To_String (M.Network);
      Visited : array (Positive range 1 .. Max_Nodes) of Boolean := [others => False];
      Stack   : array (Positive range 1 .. Max_Nodes) of Boolean := [others => False];

      function Visit (Index : Positive) return Boolean is
      begin
         if Stack (Index) then
            return False;
         end if;
         if Visited (Index) then
            return True;
         end if;

         Visited (Index) := True;
         Stack (Index) := True;
         for E in 1 .. M.Edge_Count loop
            if To_String (M.Edges (E).From) = To_String (M.Nodes (Index).Id) then
               declare
                  Target : constant Natural := Node_Index (M, To_String (M.Edges (E).To));
               begin
                  if Target = 0 or else not Visit (Target) then
                     return False;
                  end if;
               end;
            end if;
         end loop;
         Stack (Index) := False;
         return True;
      end Visit;
   begin
      Ok := True;
      Message := To_Unbounded_String ("ok");

      if M.Version /= 1 then
         Fail (Ok, Message, "version must be 1");
         return;
      end if;

      if not (Network = "testnet"
              or else Network = "testnet4"
              or else Network = "signet"
              or else Network = "regtest") then
         Fail (Ok, Message, "network must be testnet, testnet4, signet, or regtest");
         return;
      end if;

      if M.Node_Count = 0 then
         Fail (Ok, Message, "manifest must contain at least one node");
         return;
      end if;

      for I in 1 .. M.Node_Count loop
         declare
            Id : constant String := To_String (M.Nodes (I).Id);
         begin
            if not Is_Valid_Id (Id) then
               Fail (Ok, Message, "invalid node id: " & Id);
               return;
            end if;
            if M.Nodes (I).Collateral_Sat < 546 then
               Fail (Ok, Message, "node collateral below dust floor: " & Id);
               return;
            end if;
            if M.Nodes (I).Refund_Height = 0 then
               Fail (Ok, Message, "node refund height must be non-zero: " & Id);
               return;
            end if;
            for J in I + 1 .. M.Node_Count loop
               if To_String (M.Nodes (J).Id) = Id then
                  Fail (Ok, Message, "duplicate node id: " & Id);
                  return;
               end if;
            end loop;
         end;
      end loop;

      for E in 1 .. M.Edge_Count loop
         declare
            From_Id : constant String := To_String (M.Edges (E).From);
            To_Id   : constant String := To_String (M.Edges (E).To);
            Src     : constant Natural := Node_Index (M, From_Id);
            Dst     : constant Natural := Node_Index (M, To_Id);
         begin
            if Src = 0 then
               Fail (Ok, Message, "edge references missing source: " & From_Id);
               return;
            end if;
            if Dst = 0 then
               Fail (Ok, Message, "edge references missing target: " & To_Id);
               return;
            end if;
            if Src = Dst then
               Fail (Ok, Message, "self-edge is not allowed: " & From_Id);
               return;
            end if;
            if To_String (M.Edges (E).Outcome)'Length = 0 then
               Fail (Ok, Message, "edge outcome cannot be empty");
               return;
            end if;
            if M.Edges (E).Bridge_Value_Sat < 546 then
               Fail (Ok, Message, "edge bridge value below dust floor");
               return;
            end if;
            if M.Edges (E).Bridge_Value_Sat > M.Nodes (Src).Collateral_Sat then
               Fail (Ok, Message, "edge bridge value exceeds source collateral");
               return;
            end if;
            if not (M.Nodes (Src).Refund_Height < M.Edges (E).Timeout_Height
                    and then M.Edges (E).Timeout_Height < M.Nodes (Dst).Refund_Height) then
               Fail (Ok, Message, "timelock order must be source refund < bridge timeout < target refund");
               return;
            end if;
         end;
      end loop;

      for I in 1 .. M.Node_Count loop
         if not Visit (I) then
            Fail (Ok, Message, "graph must be acyclic");
            return;
         end if;
      end loop;
   end Validate;
end Niti_Manifest;
