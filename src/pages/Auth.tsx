import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Building2 } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function Auth() {
  const { user, loading, signIn, signUp, securityConfig } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).+$/;

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    await signIn(email, password);
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const nome = formData.get('nome') as string;

    setPasswordError(null);
    if (
      typeof password !== 'string' ||
      password.length < (securityConfig?.minPassword ?? 8) ||
      password.length > (securityConfig?.maxPassword ?? 128)
    ) {
      setPasswordError(
        `A senha deve ter entre ${securityConfig?.minPassword ?? 8} e ${securityConfig?.maxPassword ?? 128} caracteres.`
      );
      setIsLoading(false);
      return;
    }
    if (!complexityRegex.test(password)) {
      setPasswordError('A senha deve conter: ao menos 1 letra minúscula, 1 letra maiúscula, 1 número e 1 caractere especial.');
      setIsLoading(false);
      return;
    }
    const { error } = await signUp(email, password, nome);
    if (error) setPasswordError(error.message || 'Erro ao criar conta');
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <Logo width={180} height={60} />
          </div>
          <p className="mt-2 text-muted-foreground">
            Controle de Ordens de Serviço
          </p>
        </div>

        <Card className="card-elevated">
          <CardHeader className="text-center">
            <CardTitle>Acesse sua conta</CardTitle>
            <CardDescription>Entre com suas credenciais</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  className="input-modern"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="input-modern"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              <Button
                type="submit"
                className="btn-gradient w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Sistema moderno de controle de OS</p>
          <p>
            Versão 2.0 - Desenvolvido por
            <a
              href="https://www.linkedin.com/in/joerbeth-serra-costa"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 text-primary underline"
            >
              CyberJKNet
            </a>
            <span className="mx-1">|</span>
            <a
              href="https://www.jkinfonet.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              CyberJKNet
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
