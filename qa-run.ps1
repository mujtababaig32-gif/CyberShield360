param(
  [string]$BaseUrl = "https://cyber-shield360.vercel.app",
  [switch]$RunScanTests,
  [switch]$RunDownloadTests,
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

Write-Host "CyberShield360 Playwright QA" -ForegroundColor Cyan
Write-Host "Target: $BaseUrl" -ForegroundColor DarkCyan

$email = Read-Host "QA account email"
$securePassword = Read-Host "QA account password" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)

  $env:CS360_BASE_URL = $BaseUrl
  $env:CS360_EMAIL = $email
  $env:CS360_PASSWORD = $plainPassword
  $env:CS360_RUN_SCAN_TESTS = if ($RunScanTests) { "true" } else { "false" }
  $env:CS360_RUN_DOWNLOAD_TESTS = if ($RunDownloadTests) { "true" } else { "false" }

  Remove-Item ".\playwright\.auth\admin.json" -Force -ErrorAction SilentlyContinue

  npx playwright test
  $testExitCode = $LASTEXITCODE

  Write-Host ""
  Write-Host "HTML report: .\cybershield360-qa-report\index.html" -ForegroundColor Green
  Write-Host "JSON results: .\test-results\results.json" -ForegroundColor Green
  Write-Host "JUnit results: .\test-results\junit.xml" -ForegroundColor Green

  if (-not $NoOpen) {
    npx playwright show-report cybershield360-qa-report
  }

  exit $testExitCode
}
finally {
  if ($ptr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  }

  Remove-Item Env:CS360_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:CS360_EMAIL -ErrorAction SilentlyContinue
}

