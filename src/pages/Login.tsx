import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import logoNash from "@/assets/logo-nash.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, profile, isAdmin } = useAuth();
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
        // Aguardar o profile ser carregado
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 items-center justify-center">
            <img src={logoNash} alt="Nash" className="h-20 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-white">Brand Protection</h1>
          <p className="mt-2 text-blue-100">Sistema de Monitoramento de Anúncios</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email ou Nome de Usuário</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="seu@email.com ou seu_usuario"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <Link to="/cadastro" className="font-medium text-primary hover:underline">
                  Cadastre-se
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}