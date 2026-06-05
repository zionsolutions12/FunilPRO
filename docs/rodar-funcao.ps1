# ============================================================
# Sobe QUALQUER Edge Function localmente com Deno (sem deploy).
#   .\docs\rodar-funcao.ps1 -Funcao webhook-estagio
# Servidor em http://localhost:8000. Pare com Ctrl+C.
# ============================================================
param([Parameter(Mandatory = $true)][string]$Funcao)

Set-Location "$PSScriptRoot\.."
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$') {
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim(), 'Process')
  }
}
$env:DENO_NO_PACKAGE_JSON = "1"
$deno = "$env:USERPROFILE\.deno\bin\deno.exe"
Write-Host "Servindo '$Funcao' em http://localhost:8000  (Ctrl+C para parar)" -ForegroundColor Green
& $deno run -A --node-modules-dir=none "supabase/functions/$Funcao/index.ts"
