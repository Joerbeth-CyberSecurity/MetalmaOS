import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import JSZip from 'https://esm.sh/jszip@3.10.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackupRequest {
  include_policies_schema: boolean
  zip_enabled: boolean
  filename_pattern: string
  destination: 'local' | 'storage' | 'both'
  storage_bucket?: string
  output_format?: 'json' | 'csv'
  csv_table?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar se é POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse do body
    const body: BackupRequest = await req.json()
    const {
      include_policies_schema = true,
      zip_enabled = true,
      filename_pattern = 'metalmaos-backup-YYYY-MM-DD_HH-mm.zip',
      destination = 'local',
      storage_bucket = 'backups',
      output_format = 'csv',
      csv_table
    } = body

    // Criar cliente Supabase com Service Role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')!
    
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do Supabase não encontrada' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Verificar se o usuário tem permissão (opcional - você pode implementar sua lógica)
    // const { data: { user }, error: authError } = await supabase.auth.getUser()
    // if (authError || !user) {
    //   return new Response(
    //     JSON.stringify({ error: 'Usuário não autenticado' }),
    //     { 
    //       status: 401, 
    //       headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    //     }
    //   )
    // }

    console.log('Iniciando backup...')

    // 1. Obter lista de tabelas públicas
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE')

    if (tablesError) {
      console.error('Erro ao buscar tabelas:', tablesError)
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar tabelas do banco' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Encontradas ${tables?.length || 0} tabelas`)

    // 2. Exportar dados de cada tabela
    const backupData: any = {
      metadata: {
        timestamp: new Date().toISOString(),
        tables_count: tables?.length || 0,
        include_policies_schema,
        zip_enabled,
        destination
      },
      tables: {}
    }

    // Exportar dados das tabelas
    for (const table of tables || []) {
      try {
        console.log(`Exportando tabela: ${table.table_name}`)
        
        const { data, error } = await supabase
          .from(table.table_name)
          .select('*')

        if (error) {
          console.error(`Erro ao exportar ${table.table_name}:`, error)
          backupData.tables[table.table_name] = { error: error.message }
        } else {
          backupData.tables[table.table_name] = data || []
          console.log(`✓ ${table.table_name}: ${data?.length || 0} registros`)
        }
      } catch (err) {
        console.error(`Erro inesperado em ${table.table_name}:`, err)
        backupData.tables[table.table_name] = { error: 'Erro inesperado' }
      }
    }

    // 3. Exportar metadados (políticas, esquema, etc.) se solicitado
    if (include_policies_schema) {
      try {
        console.log('Exportando metadados...')
        
        // Políticas RLS
        const { data: policies } = await supabase
          .from('pg_policies')
          .select('*')

        // Informações do esquema
        const { data: columns } = await supabase
          .from('information_schema.columns')
          .select('*')
          .eq('table_schema', 'public')

        backupData.metadata.schema = {
          policies: policies || [],
          columns: columns || []
        }
        
        console.log('✓ Metadados exportados')
      } catch (err) {
        console.error('Erro ao exportar metadados:', err)
        backupData.metadata.schema = { error: 'Erro ao exportar metadados' }
      }
    }

    // 4. Gerar nome do arquivo com timestamp
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = filename_pattern
      .replace('YYYY-MM-DD_HH-mm', timestamp)
      .replace('YYYY-MM-DD', now.toISOString().slice(0, 10))
      .replace('HH-mm', now.toTimeString().slice(0, 5).replace(':', '-'))

    // 5. Preparar dados para download/armazenamento (JSON puro ou ZIP com CSVs)
    let data: Uint8Array
    let contentType = 'application/json'
    let finalFilename = filename

    if (output_format === 'csv') {
      // Gerar ZIP com um CSV por tabela
      console.log('Gerando CSV(s)...')
      const zip = new JSZip()

      // Utilitário para converter Array<Object> em CSV
      const toCsv = (rows: any[]): string => {
        if (!rows || rows.length === 0) return ''
        const headersSet = new Set<string>()
        // Coletar todas as chaves existentes para garantir colunas completas
        for (const row of rows) {
          Object.keys(row || {}).forEach(k => headersSet.add(k))
        }
        const headers = Array.from(headersSet)
        const escapeCell = (val: any): string => {
          if (val === null || val === undefined) return ''
          let out = typeof val === 'object' ? JSON.stringify(val) : String(val)
          // Escape aspas e envolver em aspas se necessário
          const needsQuotes = /[",\n\r]/.test(out)
          out = out.replace(/"/g, '""')
          return needsQuotes ? `"${out}"` : out
        }
        const headerLine = headers.join(',')
        const lines = rows.map(row => headers.map(h => escapeCell(row?.[h])).join(','))
        return [headerLine, ...lines].join('\n')
      }

      if (!zip_enabled) {
        // CSV direto de uma única tabela (requer csv_table)
        const tableName = (csv_table || '').trim()
        if (!tableName) {
          return new Response(
            JSON.stringify({ error: 'Para CSV direto, informe csv_table' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        const rows = Array.isArray(backupData.tables?.[tableName]) ? backupData.tables?.[tableName] as any[] : []
        const csv = toCsv(rows)
        const encoder = new TextEncoder()
        data = encoder.encode(csv)
        contentType = 'text/csv'
        if (!finalFilename.toLowerCase().endsWith('.csv')) {
          finalFilename = `${finalFilename}-${tableName}.csv`
        }
      } else {
        // ZIP com um CSV por tabela
        for (const [tableName, tableData] of Object.entries(backupData.tables || {})) {
          try {
            const csv = Array.isArray(tableData) ? toCsv(tableData as any[]) : toCsv([])
            zip.file(`${tableName}.csv`, csv)
          } catch (e) {
            console.error(`Erro ao gerar CSV para ${tableName}:`, e)
            zip.file(`${tableName}.csv`, '')
          }
        }
        // Incluir metadados como JSON dentro do ZIP
        zip.file(`metadata.json`, JSON.stringify(backupData.metadata || {}, null, 2))
        const zipContent = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' })
        data = zipContent
        contentType = 'application/zip'
        if (!finalFilename.toLowerCase().endsWith('.zip')) {
          finalFilename = `${finalFilename}.zip`
        }
      }
    } else {
      // JSON
      const jsonData = JSON.stringify(backupData, null, 2)
      const encoder = new TextEncoder()
      data = encoder.encode(jsonData)
      contentType = 'application/json'
      // Garantir extensão .json
      if (!finalFilename.toLowerCase().endsWith('.json')) {
        finalFilename = `${finalFilename}.json`
      }
    }

    // 6. Salvar no Storage se solicitado
    if (destination === 'storage' || destination === 'both') {
      try {
        const { error: uploadError } = await supabase.storage
          .from(storage_bucket)
          .upload(finalFilename, data, {
            contentType: contentType,
            upsert: true
          })

        if (uploadError) {
          console.error('Erro ao salvar no storage:', uploadError)
        } else {
          console.log(`✓ Backup salvo no storage: ${finalFilename}`)
        }
      } catch (err) {
        console.error('Erro inesperado ao salvar no storage:', err)
      }
    }

    // 7. Retornar resposta
    if (destination === 'local' || destination === 'both') {
      return new Response(data, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${finalFilename}"`,
          'Content-Length': data.length.toString()
        }
      })
    } else {
      // Apenas storage
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Backup salvo no storage',
          filename: finalFilename,
          size: data.length
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Erro geral no backup:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
