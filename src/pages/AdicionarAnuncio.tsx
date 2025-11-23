import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";

const anuncioSchema = z.object({
  cliente_id: z.string().min(1, "Selecione um cliente"),
  marketplace_id: z.string().min(1, "Selecione um marketplace"),
  produto_id: z.string().min(1, "Selecione um produto"),
  url: z.string().url("URL inválida").max(500, "URL muito longa"),
  preco_detectado: z.number().positive("Preço deve ser positivo"),
  origem: z.enum(["Denúncia", "Manual"]),
});

interface Cliente {
  id: string;
  name: string;
  empresa?: string;
}

interface Marketplace {
  id: string;
  nome: string;
}

interface Produto {
  id: string;
  nome: string;
  preco_minimo: number;
}

export default function AdicionarAnuncio() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    cliente_id: "",
    marketplace_id: "",
    produto_id: "",
    url: "",
    preco_detectado: "",
    origem: "Manual" as "Manual" | "Denúncia",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard-cliente");
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    try {
      // Buscar clientes aprovados
      const { data: clientesData, error: clientesError } = await supabase
        .from("profiles")
        .select("id, name, empresa")
        .order("name");

      if (clientesError) throw clientesError;

      // Buscar marketplaces ativos
      const { data: marketplacesData, error: marketplacesError } = await supabase
        .from("marketplaces")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (marketplacesError) throw marketplacesError;

      // Buscar produtos ativos
      const { data: produtosData, error: produtosError } = await supabase
        .from("produtos")
        .select("id, nome, preco_minimo")
        .eq("ativo", true)
        .order("nome");

      if (produtosError) throw produtosError;

      setClientes(clientesData || []);
      setMarketplaces(marketplacesData || []);
      setProdutos(produtosData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validar dados
      const validatedData = anuncioSchema.parse({
        ...formData,
        preco_detectado: parseFloat(formData.preco_detectado),
      });

      // Buscar preço mínimo do produto
      const produto = produtos.find((p) => p.id === validatedData.produto_id);
      if (!produto) {
        throw new Error("Produto não encontrado");
      }

      // Determinar status baseado no preço
      const status = validatedData.preco_detectado < produto.preco_minimo ? "Abaixo do mínimo" : "OK";

      // Inserir anúncio
      const { error } = await supabase.from("anuncios_monitorados").insert({
        cliente_id: validatedData.cliente_id,
        marketplace_id: validatedData.marketplace_id,
        produto_id: validatedData.produto_id,
        url: validatedData.url,
        preco_detectado: validatedData.preco_detectado,
        preco_minimo: produto.preco_minimo,
        origem: validatedData.origem,
        status,
      });

      if (error) throw error;

      toast({
        title: "Anúncio adicionado com sucesso!",
        description: "O anúncio foi cadastrado no sistema.",
      });

      navigate("/gerenciar-anuncios");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Erro ao adicionar anúncio",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/gerenciar-anuncios")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Adicionar Anúncio Monitorado</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente *</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cliente_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.name} {cliente.empresa ? `(${cliente.empresa})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.cliente_id && (
                  <p className="text-sm text-destructive">{errors.cliente_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketplace_id">Marketplace *</Label>
                <Select
                  value={formData.marketplace_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, marketplace_id: value })
                  }
                >
                  <SelectTrigger>
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
                {errors.marketplace_id && (
                  <p className="text-sm text-destructive">{errors.marketplace_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="produto_id">Produto *</Label>
                <Select
                  value={formData.produto_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, produto_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome} (Min: R$ {produto.preco_minimo.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.produto_id && (
                  <p className="text-sm text-destructive">{errors.produto_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL do Anúncio *</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
                {errors.url && (
                  <p className="text-sm text-destructive">{errors.url}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="preco_detectado">Preço Detectado (R$) *</Label>
                <Input
                  id="preco_detectado"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.preco_detectado}
                  onChange={(e) =>
                    setFormData({ ...formData, preco_detectado: e.target.value })
                  }
                />
                {errors.preco_detectado && (
                  <p className="text-sm text-destructive">{errors.preco_detectado}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="origem">Origem *</Label>
                <Select
                  value={formData.origem}
                  onValueChange={(value: "Manual" | "Denúncia") =>
                    setFormData({ ...formData, origem: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="Denúncia">Denúncia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Adicionando..." : "Adicionar Anúncio"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/gerenciar-anuncios")}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
