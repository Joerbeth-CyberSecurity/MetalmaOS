import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'sua_url_do_supabase';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sua_chave_anonima';

const supabase = createClient(supabaseUrl, supabaseKey);

async function importarProdutosDoCSV() {
  console.log('Iniciando importação de produtos do CSV...');
  
  try {
    // Ler o arquivo CSV
    const csvContent = fs.readFileSync('produtos.csv', 'utf-8');
    const lines = csvContent.split('\n');
    
    // Remover cabeçalho
    const dataLines = lines.slice(1);
    
    const produtos = [];
    
    dataLines.forEach((line, index) => {
      if (line.trim()) {
        // Dividir por ponto e vírgula
        const columns = line.split(';');
        
        if (columns.length >= 3) {
          const nome = columns[0].replace(/"/g, ''); // Remove aspas
          const custo = parseFloat(columns[1]) || 0;
          const venda = parseFloat(columns[2]) || 0;
          
          produtos.push({
            nome: nome,
            preco_unitario: venda, // Usar preço de venda como preço unitário
            estoque: 0,
            unidade: 'UN',
            ativo: true,
            percentual_global: 0
          });
        }
      }
    });
    
    console.log(`CSV processado. ${produtos.length} produtos encontrados.`);
    
    // Inserir produtos em lotes de 50 para evitar timeout
    const batchSize = 50;
    let totalInseridos = 0;
    
    for (let i = 0; i < produtos.length; i += batchSize) {
      const batch = produtos.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('produtos')
        .insert(batch)
        .select();

      if (error) {
        console.error(`Erro ao importar lote ${Math.floor(i/batchSize) + 1}:`, error);
        continue;
      }

      totalInseridos += data.length;
      console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${data.length} produtos importados`);
    }

    console.log(`\n🎉 Importação concluída! Total de ${totalInseridos} produtos importados com sucesso!`);
    console.log('\nPrimeiros produtos importados:');
    produtos.slice(0, 5).forEach(produto => {
      console.log(`- ${produto.nome}`);
    });

  } catch (error) {
    console.error('Erro durante a importação:', error);
  }
}

// Executar a importação
importarProdutosDoCSV(); 