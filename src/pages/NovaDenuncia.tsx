import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Produto {
  id: string;
  nome: string;
  preco_minimo: number;
}

interface Marketplace {
  id: string;
  nome: string;
}

export default function NovaDenuncia() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  
  const [url, setUrl] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [marketplaceId, setMarketplaceId] = useState("");
  const [precoInformado, setPrecoInformado] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    fetchProdutos();
    fetchMarketplaces();
  }, []);

  const fetchProdutos = async () => {
    const { data, error } = await supabase
      .from("produtos")
      .select("id, nome, preco_minimo")
      .eq("ativo", true)
      .order("nome");

    if (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } else {
      setProdutos(data || []);
    }
  };

  const fetchMarketplaces = async () => {
    const { data, error } = await supabase
      .from("marketplaces")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");

    if (error) {
      console.error("Erro ao buscar marketplaces:", error);
      toast.error("Erro ao carregar marketplaces");
    } else {
      setMarketplaces(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!url || !produtoId || !marketplaceId || !precoInformado) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const preco = parseFloat(precoInformado);
    if (isNaN(preco) || preco <= 0) {
      toast.error("Preço inválido");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("denuncias").insert({
        cliente_id: user.id,
        produto_id: produtoId,
        marketplace_id: marketplaceId,
        url: url,
        preco_informado: preco,
        observacoes: observacoes || null,
        status: "Solicitada",
      });

      if (error) throw error;

      toast.success("Denúncia registrada com sucesso!");
      
      // Reset form
      setUrl("");
      setProdutoId("");
      setMarketplaceId("");
      setPrecoInformado("");
      setObservacoes("");

      // Navigate to minhas denuncias after 2 seconds
      setTimeout(() => {
        navigate("/minhas-denuncias");
      }, 2000);

    } catch (error: any) {
      console.error("Erro ao registrar denúncia:", error);
      toast.error("Erro ao registrar denúncia. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const produtoSelecionado = produtos.find(p => p.id === produtoId);

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-2xl">Nova Denúncia</CardTitle>
          <CardDescription>
            Reporte anúncios com preços abaixo do mínimo permitido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="url">Link do Anúncio *</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://exemplo.com/produto/123"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Cole o link completo do anúncio que deseja denunciar
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="produto">Produto *</Label>
                <Select value={produtoId} onValueChange={setProdutoId} required>
                  <SelectTrigger id="produto">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketplace">Marketplace *</Label>
                <Select value={marketplaceId} onValueChange={setMarketplaceId} required>
                  <SelectTrigger id="marketplace">
                    <SelectValue placeholder="Selecione o marketplace" />
                  </SelectTrigger>
                  <SelectContent>
                    {marketplaces.map((marketplace) => (
                      <SelectItem key={marketplace.id} value={marketplace.id}>
                        {marketplace.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {produtoSelecionado && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Preço mínimo permitido para <strong>{produtoSelecionado.nome}</strong>:{" "}
                  <strong className="text-primary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(produtoSelecionado.preco_minimo)}
                  </strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="preco">Preço Encontrado (R$) *</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={precoInformado}
                onChange={(e) => setPrecoInformado(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Informe o preço do produto encontrado no anúncio
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                placeholder="Adicione informações adicionais que possam ajudar na análise..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Enviando..." : "Registrar Denúncia"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard-cliente")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
