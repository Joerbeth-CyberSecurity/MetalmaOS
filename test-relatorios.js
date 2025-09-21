// Script para testar e debugar os relatórios
// Execute este script no console do navegador para diagnosticar problemas

console.log('🔍 Iniciando diagnóstico dos relatórios...');

// Função para testar conexão com Supabase
async function testSupabaseConnection() {
  try {
    console.log('📡 Testando conexão com Supabase...');
    
    // Verificar se supabase está disponível
    if (typeof window !== 'undefined' && window.supabase) {
      const { data, error } = await window.supabase
        .from('ordens_servico')
        .select('count(*)')
        .limit(1);
      
      if (error) {
        console.error('❌ Erro na conexão Supabase:', error);
        return false;
      }
      
      console.log('✅ Conexão Supabase OK');
      return true;
    } else {
      console.error('❌ Supabase não está disponível no window');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error);
    return false;
  }
}

// Função para testar estrutura das tabelas
async function testTableStructure() {
  try {
    console.log('🗂️ Testando estrutura das tabelas...');
    
    const tables = ['ordens_servico', 'colaboradores', 'produtos', 'os_tempo', 'os_produtos'];
    
    for (const table of tables) {
      try {
        const { data, error } = await window.supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.error(`❌ Erro na tabela ${table}:`, error);
        } else {
          console.log(`✅ Tabela ${table} OK - Campos:`, Object.keys(data[0] || {}));
        }
      } catch (err) {
        console.error(`❌ Erro ao acessar tabela ${table}:`, err);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao testar estrutura:', error);
  }
}

// Função para testar consultas dos relatórios
async function testReportQueries() {
  try {
    console.log('📊 Testando consultas dos relatórios...');
    
    // Teste 1: Relatório de produtividade
    console.log('🔍 Testando relatório de produtividade...');
    const { data: colaboradores, error: err1 } = await window.supabase
      .from('colaboradores')
      .select('id, nome, meta_hora')
      .eq('ativo', true)
      .limit(5);
    
    if (err1) {
      console.error('❌ Erro ao buscar colaboradores:', err1);
    } else {
      console.log('✅ Colaboradores encontrados:', colaboradores?.length || 0);
    }
    
    // Teste 2: Relatório de OS
    console.log('🔍 Testando relatório de OS...');
    const { data: ordens, error: err2 } = await window.supabase
      .from('ordens_servico')
      .select(`
        *,
        clientes (
          nome,
          cpf_cnpj,
          telefone,
          email,
          endereco,
          cidade,
          estado,
          cep
        ),
        os_produtos (
          *,
          produtos (
            nome,
            descricao,
            unidade
          )
        ),
        os_colaboradores (
          colaborador:colaboradores(nome)
        )
      `)
      .limit(3);
    
    if (err2) {
      console.error('❌ Erro ao buscar OS:', err2);
    } else {
      console.log('✅ OS encontradas:', ordens?.length || 0);
      if (ordens && ordens.length > 0) {
        console.log('📋 Exemplo de OS:', {
          numero: ordens[0].numero_os,
          cliente: ordens[0].clientes?.nome,
          produtos: ordens[0].os_produtos?.length || 0,
          colaboradores: ordens[0].os_colaboradores?.length || 0
        });
      }
    }
    
    // Teste 3: Relatório de tempo
    console.log('🔍 Testando relatório de tempo...');
    const { data: tempos, error: err3 } = await window.supabase
      .from('os_tempo')
      .select('*')
      .limit(5);
    
    if (err3) {
      console.error('❌ Erro ao buscar tempos:', err3);
    } else {
      console.log('✅ Tempos encontrados:', tempos?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar consultas:', error);
  }
}

// Função para verificar campos ausentes
async function checkMissingFields() {
  try {
    console.log('🔍 Verificando campos ausentes...');
    
    const { data: os, error } = await window.supabase
      .from('ordens_servico')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao verificar campos:', error);
      return;
    }
    
    if (os && os.length > 0) {
      const campos = Object.keys(os[0]);
      const camposEsperados = [
        'data_fim', 'tempo_execucao_real', 'tempo_parada', 
        'desconto_tipo', 'desconto_valor', 'valor_total_com_desconto', 'observacoes'
      ];
      
      const camposAusentes = camposEsperados.filter(campo => !campos.includes(campo));
      
      if (camposAusentes.length > 0) {
        console.warn('⚠️ Campos ausentes na tabela ordens_servico:', camposAusentes);
        console.log('💡 Execute o script fix-relatorios-migration.sql para adicionar os campos');
      } else {
        console.log('✅ Todos os campos necessários estão presentes');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar campos:', error);
  }
}

// Função principal
async function runDiagnostic() {
  console.log('🚀 Iniciando diagnóstico completo...');
  
  const connectionOk = await testSupabaseConnection();
  if (!connectionOk) {
    console.error('❌ Falha na conexão. Verifique as configurações do Supabase.');
    return;
  }
  
  await testTableStructure();
  await checkMissingFields();
  await testReportQueries();
  
  console.log('✅ Diagnóstico concluído!');
  console.log('💡 Se houver problemas, execute o script fix-relatorios-migration.sql no Supabase');
}

// Executar diagnóstico
runDiagnostic();
