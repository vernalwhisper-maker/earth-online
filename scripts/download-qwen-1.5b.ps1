# Download Qwen2.5-1.5B-Instruct-q4f16_1-MLC (WebLLM model) from hf-mirror.com
# Usage: in PowerShell, run:  powershell -ExecutionPolicy Bypass -File download-qwen-1.5b.ps1
# All files will be saved to the CURRENT directory.

$ErrorActionPreference = "Stop"
$base = "https://hf-mirror.com/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main/"

$files = @(
  "mlc-chat-config.json",
  "ndarray-cache.json",
  "tensor-cache.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "vocab.json",
  "merges.txt",
  "README.md"
)
for ($i = 0; $i -le 29; $i++) { $files += "params_shard_$i.bin" }

Write-Host ("Total " + $files.Count + " files. Downloading to current dir...")
foreach ($f in $files) {
  $url = $base + $f
  # Skip only if file exists and is complete (>1KB, avoids 0-byte leftovers)
  if ((Test-Path $f) -and ((Get-Item $f).Length -gt 1024)) { Write-Host ("SKIP (exists): " + $f); continue }
  Write-Host ("Downloading: " + $f + " ...") -NoNewline
  # -C - : resume broken downloads; --retry-all-errors : retry on connection reset
  curl.exe -L -C - --retry 8 --retry-delay 2 --retry-all-errors -o $f $url
  if ($LASTEXITCODE -eq 0 -and (Test-Path $f) -and ((Get-Item $f).Length -gt 1024)) {
    $mb = [math]::Round((Get-Item $f).Length / 1MB, 1)
    Write-Host (" OK (" + $mb + " MB)") -ForegroundColor Green
  } else {
    Write-Host (" FAILED: " + $f + " (run the script again to resume)") -ForegroundColor Red
    exit 1
  }
}
Write-Host "ALL DONE. Zip all files (keep them in zip root, no extra folder) and upload to your cloud drive."
