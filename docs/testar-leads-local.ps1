# ============================================================
# Testa a função "leads" rodando LOCALMENTE (http://localhost:8000).
# Use junto com rodar-leads-local.ps1 (em outro terminal).
# ============================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8  # acentos corretos
$BASE = "http://localhost:8000"
$KEY = "fp_live_xxxxx"  # FUNILPRO_API_KEY (libera se a secret não estiver setada)

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
