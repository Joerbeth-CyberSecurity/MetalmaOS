# Metalma OS – Sistema de Controle de Ordens de Serviço

## Visão Geral
O Metalma OS é uma plataforma moderna para gestão de ordens de serviço (OS), produtividade, clientes, colaboradores e produtos, voltada para empresas que buscam eficiência, controle e análise de resultados.

- **Público-alvo:** Empresas industriais, prestadores de serviço, equipes técnicas.
- **Benefícios:** Centralização de informações, controle de produtividade, relatórios inteligentes, usabilidade moderna.

---

## Como Funciona
O sistema é dividido em módulos principais, acessíveis por uma sidebar moderna e responsiva:
- **Dashboard**: Visão geral de estatísticas e produtividade.
- **Ordens de Serviço**: Cadastro, acompanhamento e controle de OS.
- **Clientes**: Gestão de clientes com validação de CPF/CNPJ.
- **Colaboradores**: Cadastro, metas e acompanhamento de produtividade.
- **Produtos**: Controle de estoque, preços e percentual global.
- **Relatórios**: Geração de relatórios inteligentes.
- **Configurações**: Parâmetros do sistema, usuários, permissões e auditoria.

A navegação é protegida por autenticação e permissões de acesso.

---

## Módulos do Sistema

### 1. Dashboard
- Exibe totais de OS (abertas, em andamento, finalizadas), clientes, colaboradores, horas trabalhadas e meta de produtividade.
- Progresso mensal das horas trabalhadas vs meta.
- Acesso rápido para cadastro de OS, clientes, colaboradores e relatórios.

### 2. Ordens de Serviço (OS)
- **Cadastro/Edição**: Cliente, descrição, produtos, colaboradores, tempo previsto, meta por hora, valor total.
- **Associação**: Vínculo de produtos e colaboradores à OS.
- **Controle de tempo**: Registro de início, pausa, parada, finalização. Comparação entre tempo real e previsto.
- **Status**: Aberta, em andamento, finalizada, cancelada, falta de material.
- **Cálculos automáticos**: Valor total, meta por hora, tempo de execução previsto.
- **Gestão de paradas**: Registro de motivo, duração e impacto.

### 3. Clientes
- **Cadastro/Edição**: Nome, e-mail, telefone, CPF/CNPJ (com validação), endereço, cidade, estado, CEP.
- **Busca e exportação**: Filtros inteligentes, exportação de dados e impressão de relatórios.
- **Validação**: Máscara e validação de CPF/CNPJ.
- **Status**: Ativo/Inativo.

### 4. Colaboradores
- **Cadastro/Edição**: Nome, cargo, salário, meta de horas, data de admissão, CPF, e-mail, telefone, endereço.
- **Produtividade individual**: Horas trabalhadas, comparação com meta, eficiência.
- **Status**: Ativo/Inativo.

### 5. Produtos
- **Cadastro/Edição**: Nome, descrição, preço unitário, estoque, unidade, percentual global.
- **Busca e filtro**: Pesquisa por nome, exportação e impressão.
- **Status**: Ativo/Inativo.

### 6. Relatórios
- **Tipos**:
  - Produtividade por colaboradores (eficiência, horas trabalhadas, paradas por material).
  - Controle do tempo (real vs previsto por OS).
  - Status das OS (abertas, em andamento, finalizadas, canceladas).
  - Paradas por falta de material.
- **Filtros**: Período, colaborador, cliente.
- **Visualização**: Tabelas, gráficos, exportação e impressão.

### 7. Configurações
- **Parâmetros do sistema**: Percentual global de produtos, meta de horas padrão, prefixo de OS.
- **Usuários**: Cadastro, edição, exclusão, redefinição de senha, níveis de acesso.
- **Permissões**: Controle granular por módulo e ação.
- **Níveis de acesso**: Criação, edição, exclusão e associação de permissões.
- **Auditoria**: Monitoramento de login/logout, filtros por usuário, data e tipo de evento, exportação CSV.

---

## Fluxos e Lógicas de Negócio
- **Produtividade por Colaboradores**: Soma das horas trabalhadas, comparação com meta individual, exibição de eficiência e ranking.
- **Controle do Tempo**: Registro de tempo real (início, pausa, parada, finalização), análise de eficiência e gargalos.
- **Percentual Global de Produtos**: Cálculo do percentual de cada produto em relação ao total de produtos utilizados nas OS.
- **Meta de Horas Padrão**: Definição e acompanhamento mensal por colaborador.
- **Tempo de Execução Previsto**: Definido na criação da OS, usado para análise de eficiência.
- **Meta por Hora (R$)**: Valor/hora esperado para cada OS, calculado automaticamente.

---

## Dicas de Usabilidade
- Para cadastrar uma nova OS, acesse o menu "Ordens de Serviço" e clique em "Adicionar".
- Utilize os filtros e exporte relatórios conforme a necessidade.
- Registre paradas e pausas diretamente na OS para controle preciso do tempo.
- Acompanhe a produtividade da equipe pelo dashboard e relatórios.
- Altere o tema (claro/escuro) no topo da tela.


---

## Suporte
- E-mail: informatica@jkinfonet.com.br

---

**Este arquivo README.md é a documentação oficial e única do MetalmaOS.**
