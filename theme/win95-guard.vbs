Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
native = dir & "\win95-guard.exe"
If fso.FileExists(native) Then
  cmd = """" & native & """"
Else
  cmd = "node.exe """ & dir & "\win95-guard.mjs"""
End If
If WScript.Arguments.Count > 0 Then
  cmd = cmd & " """ & WScript.Arguments(0) & """"
End If
shell.Run cmd, 0, False
