import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export const DarkModeToggle: React.FC = () => {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <button
      aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      onClick={() => setDark((d) => !d)}
      className="ml-2 rounded-full p-2 transition-colors hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary"
      title={dark ? 'Modo escuro ativado' : 'Modo claro ativado'}
    >
      {dark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-700" />}
    </button>
  );
}; 