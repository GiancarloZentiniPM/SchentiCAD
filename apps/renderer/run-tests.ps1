$ErrorActionPreference = "Continue"
Set-Location "c:\Users\ZentiniG\OneDrive - Putzmeister Holding GmbH\Desktop\GIT_Repos\SchentiCAD\apps\renderer"
$logFile = "test-results.log"

Write-Output "Starting tests at $(Get-Date)" | Out-File $logFile
Write-Output "CWD: $(Get-Location)" | Out-File $logFile -Append
Write-Output "Node: $(node --version 2>&1)" | Out-File $logFile -Append
Write-Output "NPX: $(npx --version 2>&1)" | Out-File $logFile -Append
Write-Output "---" | Out-File $logFile -Append

$result = & npx playwright test --reporter=list 2>&1
$result | Out-File $logFile -Append

Write-Output "---EXIT CODE: $LASTEXITCODE---" | Out-File $logFile -Append
Write-Output "Finished at $(Get-Date)" | Out-File $logFile -Append

Write-Host "TESTS_COMPLETE"
