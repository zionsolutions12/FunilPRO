# ============================================================
# Sobe a function "leads" LOCAL em modo aberto (sem exigir x-api-key),
# só para você visualizar no navegador (http://localhost:8000/leads).
# NÃO use assim em produção — é só para teste local.
# Pare com Ctrl+C.
# ============================================================
Set-Location "$PSScriptRoot\.."

# Carrega o .env, mas SEM a FUNILPRO_API_KEY (assim a função libera sem header)
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$') {
    $nome = $Matches[1]
    if ($nome -ne 'FUNILPRO_API_KEY') {
      [Environment]::SetEnvironmentVariable($nome, $Matches[2].Trim(), 'Process')
    }
  }
}
[Environment]::SetEnvironmentVariable('FUNILPRO_API_KEY', $null, 'Process')

$env:DENO_NO_PACKAGE_JSON = "1"
$deno = "$env:USERPROFILE\.deno\bin\deno.exe"
Write-Host "Servindo 'leads' (modo aberto) em http://localhost:8000/leads  (Ctrl+C para parar)" -ForegroundColor Green
& $deno run -A --node-modules-dir=none supabase/functions/leads/index.ts
