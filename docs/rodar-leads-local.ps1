# ============================================================
# Roda a Edge Function "leads" LOCALMENTE com Deno (sem deploy).
# O servidor sobe em http://localhost:8000 e conecta no banco real
# do Supabase usando as chaves do .env.
# Pare com Ctrl+C.
# ============================================================
Set-Location "$PSScriptRoot\.."

# Carrega as variáveis do .env para o processo
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$') {
    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim(), 'Process')
  }
}

# Faz o Deno ignorar o package.json do projeto (criado para o Supabase CLI)
# e resolver as dependências npm pelo cache global, como no runtime do Supabase.
$env:DENO_NO_PACKAGE_JSON = "1"

$deno = "$env:USERPROFILE\.deno\bin\deno.exe"
Write-Host "Servindo 'leads' em http://localhost:8000  (Ctrl+C para parar)" -ForegroundColor Green
& $deno run -A --node-modules-dir=none supabase/functions/leads/index.ts
