$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Can node: https://nodejs.org/"
  exit 1
}
if (-not (Test-Path "node_modules")) {
  npm install
}
npm run build
node server.mjs
