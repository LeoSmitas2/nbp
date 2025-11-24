import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, User, Mail, Lock, Phone, IdCard, Plus, X } from "lucide-react";
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
            Junte-se a nós
          </h1>
          <p className="text-lg text-purple-100 leading-relaxed">
            Crie sua conta e comece a proteger sua marca contra violações de preços em marketplaces.
          </p>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-8 animate-slide-up py-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={logoNash} alt="Nash" className="h-16 w-auto" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">CRIAR CONTA</h2>
            <p className="text-muted-foreground">Preencha os dados para se cadastrar</p>
          </div>

          {success ? (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                ✓ Conta criada com sucesso! Aguarde a aprovação da equipe Nash.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="animate-shake">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="empresa" className="text-sm font-medium">
                    Nome da Empresa *
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="empresa"
                      type="text"
                      placeholder="Sua empresa"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-sm font-medium">
                    CNPJ *
                  </Label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="cnpj"
                      type="text"
                      placeholder="00.000.000/0000-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nome-contato" className="text-sm font-medium">
                    Nome do Contato *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="nome-contato"
                      type="text"
                      placeholder="João Silva"
                      value={nomeContato}
                      onChange={(e) => setNomeContato(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-sm font-medium">
                    Telefone (WhatsApp) *
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="telefone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={telefoneContato}
                      onChange={(e) => setTelefoneContato(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Nome de Usuário *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="seu_usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Senha *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirmar *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Lojas nos Marketplaces *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLoja}
                      className="h-8 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  
                  {lojas.map((loja, index) => (
                    <div key={index} className="flex gap-2 items-start border border-border rounded-lg p-3 bg-muted/30">
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Nome da loja"
                          value={loja.nome}
                          onChange={(e) => updateLoja(index, "nome", e.target.value)}
                          className="h-10"
                          required
                        />
                        <Select
                          value={loja.marketplace}
                          onValueChange={(value) => updateLoja(index, "marketplace", value)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Marketplace" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
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
                          className="h-9 w-9 mt-0.5"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={loading}
              >
                {loading ? "Criando conta..." : "CRIAR CONTA"}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Já tem uma conta?{" "}
                  <Link 
                    to="/login" 
                    className="font-semibold text-primary hover:underline"
                  >
                    Fazer login
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}