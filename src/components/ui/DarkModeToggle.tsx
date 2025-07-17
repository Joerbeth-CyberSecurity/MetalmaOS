import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export const DarkModeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      onClick={toggleTheme}
      className="ml-2 rounded-full p-2 transition-colors hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary"
      title={isDark ? 'Modo escuro ativado' : 'Modo claro ativado'}
    >
      {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-700" />}
    </button>
  );
}; 