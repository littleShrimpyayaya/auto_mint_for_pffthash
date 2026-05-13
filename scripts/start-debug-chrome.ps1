$ErrorActionPreference = "Stop"

$chrome = $env:PFF_CHROME_EXE
if (-not $chrome) {
  $candidates = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
  )
  $chrome = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $chrome) {
  throw "Chrome was not found. Set PFF_CHROME_EXE to chrome.exe."
}

$userDataDir = if ($env:PFF_CHROME_USER_DATA_DIR) {
  $env:PFF_CHROME_USER_DATA_DIR
} else {
  Join-Path $env:LOCALAPPDATA "Google\Chrome\User Data"
}

$profile = if ($env:PFF_CHROME_PROFILE) { $env:PFF_CHROME_PROFILE } else { "Default" }
$port = if ($env:PFF_CDP_PORT) { $env:PFF_CDP_PORT } else { "9222" }

Write-Host "Starting Chrome with remote debugging on port $port"
Write-Host "If it opens without your normal MetaMask state, close all Chrome windows and run this again."

Start-Process -FilePath $chrome -ArgumentList @(
  "--remote-debugging-port=$port",
  "--user-data-dir=$userDataDir",
  "--profile-directory=$profile",
  "https://pffthash.com/"
)
