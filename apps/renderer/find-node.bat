@echo off
echo === NODE CHECK ===
where node 2>nul
if errorlevel 1 (
  echo Node not found in PATH
  echo Checking common locations...
  if exist "%APPDATA%\nvm\nvm.exe" echo FOUND NVM: %APPDATA%\nvm\nvm.exe
  if exist "%ProgramFiles%\nodejs\node.exe" echo FOUND: %ProgramFiles%\nodejs\node.exe
  if exist "%LOCALAPPDATA%\fnm" echo FOUND FNM: %LOCALAPPDATA%\fnm
  dir /s /b "%USERPROFILE%\AppData\Local\fnm\node*" 2>nul
  dir /s /b "%APPDATA%\nvm\v*\node.exe" 2>nul
  dir /s /b "C:\Program Files\nodejs\node.exe" 2>nul
) else (
  echo Node found!
)
echo === PATH ===
echo %PATH%
echo === DONE ===
