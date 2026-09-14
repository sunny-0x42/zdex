# Local-only keys with empty password. -nobackup so the seed is not printed.
$ErrorActionPreference = "Continue"
$Gnokey = "C:\Users\Hi\tools\gnokey.exe"
$listed = & $Gnokey list 2>$null | Out-String
$n = 100
$made = 0
for ($i = 0; $i -lt $n; $i++) {
  $name = "zload_{0:d3}" -f $i
  if ($listed -match [regex]::Escape($name)) { continue }
  "`n`n" | & $Gnokey add $name -nobackup -quiet -insecure-password-stdin 2>$null | Out-Null
  $made++
}
Write-Host "zload keys ready (created $made)"
