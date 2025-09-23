import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportRequestMeta {
  table: string
  on_conflict?: string // coluna(s) separadas por vírgula
  delimiter?: string
  encoding?: string
  has_header?: boolean
  chunk_size?: number
}

function parseCsv(text: string, delimiter = ','): { headers: string[]; rows: string[][] } {
  // Parser simples ciente de aspas duplas
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false }
      } else { field += c }
    } else {
      if (c === '"') { inQuotes = true }
      else if (c === delimiter) { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* ignore */ }
      else { field += c }
    }
  }
  // flush
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  const headers = rows.shift() || []
  return { headers, rows }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Authorization via anon key (frontend) — privilegie Storage/row-level policies no projeto
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autorização necessário' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const contentType = req.headers.get('Content-Type') || ''
    if (!contentType.startsWith('application/json')) {
      return new Response(JSON.stringify({ error: 'Envie como application/json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json() as { meta: ImportRequestMeta; csv: string }
    const { meta, csv } = body
    const table = meta?.table?.trim()
    if (!table) {
      return new Response(JSON.stringify({ error: 'Tabela é obrigatória' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const delimiter = meta.delimiter || ','
    const hasHeader = meta.has_header !== false
    const chunkSize = Math.min(Math.max(meta.chunk_size || 2000, 500), 10000)

    const { headers, rows } = parseCsv(csv, delimiter)
    const cols = hasHeader ? headers : headers.map((_, idx) => `col${idx+1}`)

    // Transformar linhas em objetos
    const objects = rows.map(r => {
      const obj: Record<string, any> = {}
      for (let i = 0; i < cols.length; i++) { obj[cols[i]] = r[i] ?? null }
      return obj
    })

    // Enviar por lotes usando REST (upsert)
    const conflict = (meta.on_conflict || '').trim()
    const onConflictParam = conflict ? `?on_conflict=${encodeURIComponent(conflict)}` : ''

    let inserted = 0
    for (let i = 0; i < objects.length; i += chunkSize) {
      const chunk = objects.slice(i, i + chunkSize)
      const resp = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}${onConflictParam}`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(chunk)
      })
      if (!resp.ok) {
        const err = await resp.text().catch(() => '')
        return new Response(JSON.stringify({ error: 'Falha ao importar', details: err, at: i }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      inserted += chunk.length
    }

    return new Response(JSON.stringify({ success: true, inserted }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erro interno', details: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


