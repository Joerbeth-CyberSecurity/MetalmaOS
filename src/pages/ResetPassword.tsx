import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Eye, EyeOff, Lock } from "lucide-react";
import logo from "@/assets/logo.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { refreshUserProfile } = useAuth();

  useEffect(() => {
    // Pega o access_token da hash da URL
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const accessToken = params.get("access_token");
    const type = params.get("type");
    
    if (type === "recovery" && accessToken) {
      setToken(accessToken);
      setMessage("Digite sua nova senha abaixo");
      setMessageType("info");
    } else {
      setMessage("Link inválido ou expirado. Solicite um novo link de redefinição.");
      setMessageType("error");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    // Validações
    if (password.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres");
      setMessageType("error");
      return;
    }
    
    if (password !== confirmPassword) {
      setMessage("As senhas não coincidem");
      setMessageType("error");
      return;
    }
    
    setLoading(true);
    
    try {
      // Primeiro, definir a sessão com o token de recuperação
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: token
      });
      
      if (sessionError) {
        setMessage("Token inválido ou expirado: " + sessionError.message);
        setMessageType("error");
        return;
      }
      
      // Agora atualizar a senha
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        setMessage("Erro ao redefinir senha: " + error.message);
        setMessageType("error");
      } else {
        setMessage("Senha redefinida com sucesso! Redirecionando...");
        setMessageType("success");
        
        // Forçar atualização do perfil do usuário
        try {
          await refreshUserProfile();
        } catch (error) {
          console.error('Erro ao atualizar perfil:', error);
        }
        
        // Aguarda 2 segundos e redireciona
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (error) {
      setMessage("Erro inesperado. Tente novamente.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const getMessageIcon = () => {
    switch (messageType) {
      case "success":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  const getMessageColor = () => {
    switch (messageType) {
      case "success":
        return "border-green-200 bg-green-50 text-green-800";
      case "error":
        return "border-red-200 bg-red-50 text-red-800";
      default:
        return "border-blue-200 bg-blue-50 text-blue-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={logo} 
              alt="Metalma Logo" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Sistema de Controle de Ordens de Serviço
          </h1>
          <p className="text-muted-foreground">
            Metalma Inox & Cia - Gestão Moderna e Eficiente
          </p>
        </div>

        {/* Card Principal */}
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-semibold text-foreground">
              Nova Senha
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Digite sua nova senha abaixo.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Mensagem de Status */}
            {message && (
              <Alert className={getMessageColor()}>
                {getMessageIcon()}
                <AlertDescription className="ml-2">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            {/* Formulário */}
            {token && messageType !== "success" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Campo Nova Senha */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua nova senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A senha deve ter pelo menos 6 caracteres.
                  </p>
                </div>

                {/* Campo Confirmar Senha */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirme sua nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Botão Submit */}
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    "Salvar Nova Senha"
                  )}
                </Button>
              </form>
            )}

            {/* Botão Voltar para Login */}
            {messageType === "success" && (
              <div className="text-center">
                <Button
                  onClick={() => navigate("/")}
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Ir para o Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            As senhas devem ser idênticas.
          </p>
        </div>
      </div>
    </div>
  );
} 