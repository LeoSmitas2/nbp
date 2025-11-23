import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import logoNash from "@/assets/logo-nash.png";

export default function Cadastro() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [nomeContato, setNomeContato] = useState("");
  const [lojas, setLojas] = useState<Array<{ nome: string; marketplace: string }>>([
    { nome: "", marketplace: "" }
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const marketplaces = ["Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas"];

  const addLoja = () => {
    setLojas([...lojas, { nome: "", marketplace: "" }]);
  };

  const removeLoja = (index: number) => {
    if (lojas.length > 1) {
      setLojas(lojas.filter((_, i) => i !== index));
    }
  };

  const updateLoja = (index: number, field: "nome" | "marketplace", value: string) => {
    const newLojas = [...lojas];
    newLojas[index][field] = value;
    setLojas(newLojas);
  };
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    if (!empresa || !cnpj || !username || !telefoneContato || !nomeContato) {
      setError("Por favor, preencha todos os campos obrigatórios");
      setLoading(false);
      return;
    }

    // Validate lojas
    const lojasValidas = lojas.filter(l => l.nome.trim() && l.marketplace);
    if (lojasValidas.length === 0) {
      setError("Adicione pelo menos uma loja com marketplace");
      setLoading(false);
      return;
    }

    try {
      const { error } = await signUp(email, password, username, empresa, cnpj, telefoneContato, nomeContato, lojasValidas);

      if (error) {
        if (error.message.includes("already registered")) {
          setError("Este email já está cadastrado");
        } else {
          setError(error.message);
        }
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate("/pending-approval");
        }, 2000);
      }
    } catch (err) {
      setError("Erro ao criar conta. Tente novamente.");
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
            <CardTitle>Criar Conta</CardTitle>
            <CardDescription>Cadastre-se para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <Alert>
                <AlertDescription>
                  Conta criada com sucesso! Aguarde a aprovação da equipe Nash.
                </AlertDescription>
              </Alert>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="empresa">Nome da Empresa</Label>
                  <Input
                    id="empresa"
                    type="text"
                    placeholder="Nome da sua empresa"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome-contato">Nome da Pessoa de Contato</Label>
                  <Input
                    id="nome-contato"
                    type="text"
                    placeholder="João Silva"
                    value={nomeContato}
                    onChange={(e) => setNomeContato(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone de Contato (WhatsApp)</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={telefoneContato}
                    onChange={(e) => setTelefoneContato(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nome de Usuário</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="seu_usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
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
                  <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Lojas nos Marketplaces</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLoja}
                      className="h-8"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Loja
                    </Button>
                  </div>
                  
                  {lojas.map((loja, index) => (
                    <div key={index} className="flex gap-2 items-start border border-border rounded-lg p-3">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Nome da loja"
                          value={loja.nome}
                          onChange={(e) => updateLoja(index, "nome", e.target.value)}
                          required
                        />
                        <Select
                          value={loja.marketplace}
                          onValueChange={(value) => updateLoja(index, "marketplace", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o marketplace" />
                          </SelectTrigger>
                          <SelectContent>
                            {marketplaces.map((mp) => (
                              <SelectItem key={mp} value={mp}>
                                {mp}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {lojas.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLoja(index)}
                          className="h-10 w-10 mt-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando conta..." : "Criar Conta"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Já tem uma conta?{" "}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Fazer login
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}