import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type BackupJSON = {
  metadata?: any
  tables: Record<string, any[]>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')!
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'SUPABASE_URL/SERVICE_ROLE_KEY ausentes' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { backup } = await req.json() as { backup: BackupJSON }
    if (!backup || !backup.tables || typeof backup.tables !== 'object') {
      return new Response(JSON.stringify({ error: 'Backup JSON inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Descobrir colunas PK por tabela
    const { data: pkConstraints } = await admin
      .from('information_schema.table_constraints')
      .select('table_name,constraint_type,constraint_name,table_schema')
      .eq('table_schema', 'public')
      .eq('constraint_type', 'PRIMARY KEY')

    const { data: keyUsage } = await admin
      .from('information_schema.key_column_usage')
      .select('table_name,constraint_name,column_name,table_schema')
      .eq('table_schema', 'public')

    const tableToPkCols: Record<string, string[]> = {}
    for (const c of (pkConstraints || [])) {
      const cols = (keyUsage || [])
        .filter(k => k.table_name === c.table_name && k.constraint_name === c.constraint_name)
        .map(k => k.column_name)
      if (cols.length) tableToPkCols[c.table_name] = cols
    }

    const tableNames = Object.keys(backup.tables)

    const upsertTable = async (table: string, rows: any[]) => {
      if (!rows || rows.length === 0) return 0
      const pkCols = tableToPkCols[table]
      const onConflict = pkCols?.length ? pkCols.join(',') : ''
      const chunkSize = 2000
      let total = 0
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)
        const resp = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}${onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : ''}`, {
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
          throw new Error(`Falha ao restaurar ${table} @${i}: ${err}`)
        }
        total += chunk.length
      }
      return total
    }

    const results: Record<string, number> = {}
    for (const table of tableNames) {
      const rows = backup.tables[table] || []
      const inserted = await upsertTable(table, rows)
      results[table] = inserted
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Erro no restore', details: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})


