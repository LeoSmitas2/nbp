import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Lock } from "lucide-react";
import logoNash from "@/assets/logo-nash.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
      } else {
        setTimeout(() => {
          if (isAdmin) {
            navigate("/dashboard");
          } else {
            navigate("/dashboard-cliente");
          }
        }, 500);
      }
    } catch (err) {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left Panel - Gradient Background with Geometric Shapes */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-12 items-center justify-center overflow-hidden">
        {/* Animated Geometric Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full opacity-30 blur-3xl animate-pulse" />
          <div className="absolute bottom-32 right-20 w-96 h-96 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full opacity-20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          
          {/* Diagonal Lines */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <line x1="10%" y1="30%" x2="35%" y2="15%" stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeLinecap="round" className="animate-pulse" />
            <line x1="15%" y1="50%" x2="45%" y2="25%" stroke="rgba(255,255,255,0.15)" strokeWidth="4" strokeLinecap="round" />
            <line x1="20%" y1="70%" x2="50%" y2="45%" stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeLinecap="round" />
            <line x1="60%" y1="80%" x2="85%" y2="60%" stroke="rgba(255,134,89,0.3)" strokeWidth="6" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
            <line x1="65%" y1="50%" x2="90%" y2="35%" stroke="rgba(255,134,89,0.25)" strokeWidth="5" strokeLinecap="round" />
            <circle cx="75%" cy="25%" r="60" fill="rgba(255,134,89,0.3)" className="animate-pulse" style={{ animationDelay: '1.5s' }} />
            <circle cx="25%" cy="85%" r="40" fill="rgba(255,255,255,0.15)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-md text-white space-y-6 animate-fade-in">
          <div className="flex items-center justify-center mb-8">
            <img src={logoNash} alt="Nash" className="h-24 w-auto filter drop-shadow-lg" />
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            Bem-vindo ao<br />Brand Protection
          </h1>
          <p className="text-lg text-purple-100 leading-relaxed">
            Proteja sua marca monitorando anúncios em marketplaces. 
            Sistema completo de análise e denúncia de violações de preços.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logoNash} alt="Nash" className="h-16 w-auto" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">LOGIN</h2>
            <p className="text-muted-foreground">Entre com suas credenciais</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive" className="animate-shake">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email ou Usuário
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span className="text-sm text-muted-foreground">Lembrar-me</span>
                </label>
                <Button type="button" variant="link" className="text-sm text-primary p-0 h-auto">
                  Esqueceu a senha?
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={loading}
            >
              {loading ? "Entrando..." : "ENTRAR"}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <Link 
                  to="/cadastro" 
                  className="font-semibold text-primary hover:underline"
                >
                  Cadastre-se aqui
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}