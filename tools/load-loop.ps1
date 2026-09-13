# Local-only: repeat v2 load test until tools/STOP-LOAD exists or the process is killed.
# Does not sign Pearl. tBTC is not Bitcoin.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Stop = Join-Path $Root "tools\STOP-LOAD"
$LogDir = Join-Path $Root "data"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir "load-loop.log"
if (-not $env:GNOROOT) { $env:GNOROOT = "C:\Users\Hi\tools\gno" }
Set-Location $Root
$n = 0
while (-not (Test-Path $Stop)) {
  $n++
  $ts = Get-Date -Format "s"
  Add-Content $Log "$ts cycle=$n start"
  & gno test ./gno.land/r/zdex/v2/ *>> $Log
  if ($LASTEXITCODE -ne 0) {
    Add-Content $Log "$ts cycle=$n FAIL exit=$LASTEXITCODE"
    exit $LASTEXITCODE
  }
  Add-Content $Log "$ts cycle=$n ok"
  Start-Sleep -Seconds 8
}
Add-Content $Log "$(Get-Date -Format s) STOP-LOAD"
exit 0
