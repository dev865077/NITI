with Ada.Command_Line;
with Ada.Exceptions;
with Ada.Strings.Unbounded;
with Ada.Text_IO;
with Niti_Manifest;

procedure Niti_Manifest_Validate is
   use Ada.Strings.Unbounded;

   M       : Niti_Manifest.Manifest;
   Ok      : Boolean;
   Message : Unbounded_String;
begin
   if Ada.Command_Line.Argument_Count /= 1 then
      Ada.Text_IO.Put_Line ("usage: niti_manifest_validate <manifest.json>");
      Ada.Command_Line.Set_Exit_Status (2);
      return;
   end if;

   M := Niti_Manifest.Load (Ada.Command_Line.Argument (1));
   Niti_Manifest.Validate (M, Ok, Message);

   if Ok then
      Ada.Text_IO.Put_Line
        ("ok nodes=" & Natural'Image (M.Node_Count)
         & " edges=" & Natural'Image (M.Edge_Count));
      Ada.Command_Line.Set_Exit_Status (0);
   else
      Ada.Text_IO.Put_Line ("invalid: " & To_String (Message));
      Ada.Command_Line.Set_Exit_Status (1);
   end if;
exception
   when E : others =>
      Ada.Text_IO.Put_Line ("invalid: " & Ada.Exceptions.Exception_Message (E));
      Ada.Command_Line.Set_Exit_Status (1);
end Niti_Manifest_Validate;
