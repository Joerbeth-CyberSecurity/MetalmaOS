import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mainModules, adminModules } from '@/lib/navigation';

export default function Ajuda() {
  const [search, setSearch] = useState('');
  const helpLinks = useMemo(
    () => [
      {
        title: 'Site da Ajuda (GitHub Pages)',
        url: 'https://joerbeth-cybersecurity.github.io/ajudaMetalmaOS/',
        description: 'Versão hospedada publicamente do material de ajuda.',
        external: true,
      },
    ],
    []
  );
  const modules = useMemo(() => {
    const nav = [...mainModules, ...adminModules].map((m) => ({
      title: m.title,
      url: m.url,
      description: m.description,
      external: m.external,
    }));
    return [...nav, ...helpLinks];
  }, [helpLinks]);
  const filteredModules = useMemo(() => {
    if (!search.trim()) return modules;
    const q = search.toLowerCase();
    return modules.filter((m) =>
      [m.title, m.description, m.url]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [modules, search]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-4xl w-full">
        <CardHeader>
          <CardTitle>Ajuda & Suporte</CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-lg font-semibold mb-2">Bem-vindo à Central de Ajuda do Metalma OS!</h2>
          <p className="mb-4 text-sm">
            Esta página reúne dicas rápidas, links diretos e documentação para todos os módulos do sistema.
          </p>

          <h3 className="font-semibold mb-2">Resumo do Sistema</h3>
          <ul className="list-disc ml-6 mb-4 text-sm">
            <li>Gestão completa de Ordens de Serviço: cadastro, edição, controle de tempo e status.</li>
            <li>Clientes com validação de CPF/CNPJ, filtros avançados, exportação e impressão.</li>
            <li>Colaboradores com metas de horas, acompanhamento de produtividade e status.</li>
            <li>Produtos com preço, estoque, unidade e percentual global.</li>
            <li>Relatórios de produtividade, tempo real vs. previsto e status das OS, com filtros e exportação.</li>
            <li>Configurações: parâmetros do sistema, usuários, permissões, níveis de acesso e auditoria.</li>
            <li>Interface moderna com tema claro/escuro e proteção por autenticação/permissões.</li>
          </ul>

          <h3 className="font-semibold mb-2">Módulos e Ações Rápidas</h3>
          <div className="mb-3">
            <Input
              placeholder="Buscar por módulo, ação ou descrição..."
              className="max-w-md"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {filteredModules.map((m) => (
              <div key={`${m.url}-${m.title}`} className="border rounded p-3">
                <div className="font-semibold">{m.title}</div>
                {m.description && (
                  <p className="text-sm mb-2">{m.description}</p>
                )}
                {m.external ? (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm">Abrir</Button>
                  </a>
                ) : (
                  <Link to={m.url}>
                    <Button size="sm">Abrir</Button>
                  </Link>
                )}
              </div>
            ))}
          </div>

          <h3 className="font-semibold mb-1">Dicas rápidas</h3>
          <ul className="list-disc ml-6 mb-4 text-sm">
            <li>Use o menu lateral para navegar entre os módulos.</li>
            <li>Para cadastrar uma nova OS, acesse <b>Ordens de Serviço</b> → <b>Adicionar</b>.</li>
            <li>Em <b>Configurações</b>, ajuste parâmetros, usuários e permissões.</li>
            <li>Alterne o tema claro/escuro pelo controle no topo da tela.</li>
            <li>Relatórios podem ser exportados e impressos diretamente do sistema.</li>
          </ul>

          <h3 className="font-semibold mb-1">Atalhos úteis</h3>
          <ul className="list-disc ml-6 mb-4 text-sm">
            <li><b>Ctrl+B</b>: Expandir/recolher menu lateral</li>
            <li><b>Ctrl+F</b>: Buscar registros (em listas)</li>
            <li><b>Ctrl+S</b>: Salvar formulário (quando disponível)</li>
          </ul>

          <h3 className="font-semibold mb-1">Documentação</h3>
          <ul className="list-disc ml-6 text-sm mb-4">
            <li>
              <a
                href="https://joerbeth-cybersecurity.github.io/ajudaMetalmaOS/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Site da Ajuda (GitHub Pages)
              </a>
            </li>
            <li>
              <a href="/MetalmaOS-Manual.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                Manual em PDF
              </a>
            </li>
          </ul>

          <h3 className="font-semibold mb-1">Suporte</h3>
          <p className="mb-2 text-sm">
            Em caso de dúvidas ou problemas, entre em contato:<br/>
            <b>Email:</b> informatica@jkinfonet.com.br
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 