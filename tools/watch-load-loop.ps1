# Wake only on failure or explicit stop. Silent while healthy.
$Root = "C:\Users\Hi\zdex"
$Stop = Join-Path $Root "tools\STOP-LOAD"
$Log = Join-Path $Root "data\load-loop.log"
while ($true) {
  if (Test-Path $Stop) { Write-Output "CANCELLED"; exit 0 }
  try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -UseBasicParsing -TimeoutSec 5
  } catch {
    Write-Output "FAILED"
    exit 1
  }
  if (Test-Path $Log) {
    $tail = Get-Content $Log -Tail 8 -ErrorAction SilentlyContinue | Out-String
    if ($tail -match "FAIL exit") { Write-Output "FAILED"; exit 1 }
  }
  Start-Sleep -Seconds 30
}
