import React from 'react';
import { Logo } from './Logo';

interface ReportTemplateProps {
  children: React.ReactNode;
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({ children }) => (
  <div
    style={{
      background: '#fff',
      color: '#111',
      fontFamily: 'Inter, Roboto, Arial, sans-serif',
      minHeight: '100vh',
      width: '100%',
      maxWidth: '900px',
      margin: '0 auto',
      padding: '32px 32px 48px 32px',
      boxSizing: 'border-box',
      position: 'relative',
    }}
    className="report-a4"
  >
    {/* Cabeçalho com logo */}
    <header style={{ textAlign: 'center', marginBottom: 32 }}>
      <Logo width={220} height={60} />
    </header>
    {/* Conteúdo do relatório */}
    <main>{children}</main>
    {/* Rodapé */}
    <footer style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 16,
      textAlign: 'center',
      fontSize: 14,
      color: '#bfc0c0',
      letterSpacing: 1,
    }}>
      Metalma Inox & Cia
    </footer>
    <style>{`
      @media print {
        .report-a4 {
          background: #fff !important;
          color: #111 !important;
          box-shadow: none !important;
          width: 210mm;
          min-height: 297mm;
          padding: 24mm 16mm 24mm 16mm !important;
        }
        .report-a4 header, .report-a4 footer {
          background: none !important;
          box-shadow: none !important;
        }
      }
    `}</style>
  </div>
); 