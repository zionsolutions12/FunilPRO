# ============================================================
# Teste da Edge Function "leads" com curl (PowerShell)
# Rode com:  .\docs\testar-leads.ps1
# ============================================================

# URL das Edge Functions (seu projeto)
$BASE = "https://qsecahzfqrqdgszuqvbn.supabase.co/functions/v1"

# Sua FUNILPRO_API_KEY. Se você NÃO definiu a secret FUNILPRO_API_KEY no
# Supabase, a função libera sem checar — pode deixar qualquer valor aqui.
$KEY = "fp_live_xxxxx"

# Helper: chama a função e imprime o JSON formatado
function Testar($titulo, $url) {
  Write-Host "`n=== $titulo ===" -ForegroundColor Cyan
  Write-Host "GET $url" -ForegroundColor DarkGray
  $resp = curl.exe -s $url -H "x-api-key: $KEY"
  try { $resp | ConvertFrom-Json | ConvertTo-Json -Depth 6 } catch { $resp }
}

Testar "1) Todos os leads"                "$BASE/leads"
Testar "2) Filtro por estagio=proposta"   "$BASE/leads?estagio=proposta"
Testar "3) Filtro por valor_minimo=8000"  "$BASE/leads?valor_minimo=8000"
Testar "4) Combinado (negociacao + 8000)" "$BASE/leads?estagio=negociacao&valor_minimo=8000"
