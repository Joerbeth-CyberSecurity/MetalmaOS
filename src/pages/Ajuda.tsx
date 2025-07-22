import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Ajuda() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>Ajuda & Suporte</CardTitle>
        </CardHeader>
        <CardContent>
          <h2 className="text-lg font-semibold mb-2">Bem-vindo à Central de Ajuda do Metalma OS!</h2>
          <ul className="list-disc ml-6 mb-4 text-sm">
            <li>Utilize o menu lateral para navegar entre os módulos do sistema.</li>
            <li>Para cadastrar uma nova Ordem de Serviço, acesse <b>Ordens de Serviço</b> &rarr; <b>Adicionar</b>.</li>
            <li>Em <b>Configurações</b> você pode ajustar parâmetros do sistema, usuários e permissões.</li>
            <li>O tema claro/escuro pode ser alternado no topo da tela.</li>
            <li>Relatórios podem ser exportados e impressos diretamente do sistema.</li>
          </ul>
          <h3 className="font-semibold mb-1">Atalhos úteis:</h3>
          <ul className="list-disc ml-6 mb-4 text-sm">
            <li><b>Ctrl+B</b>: Expandir/recolher menu lateral</li>
            <li><b>Ctrl+F</b>: Buscar registros (em listas)</li>
            <li><b>Ctrl+S</b>: Salvar formulário (quando disponível)</li>
          </ul>
          <h3 className="font-semibold mb-1">Suporte:</h3>
          <p className="mb-2 text-sm">Em caso de dúvidas ou problemas, entre em contato:<br/>
            <b>Email:</b> informatica@jkinfonet.com.br<br/>
            <b>WhatsApp:</b> (xx) xxxxx-xxxx
          </p>
          <h3 className="font-semibold mb-1">Documentação:</h3>
          <ul className="list-disc ml-6 text-sm">
            <li><a href="/Ajuda/README_SITE.md" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Manual do Sistema (Markdown)</a></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
} 