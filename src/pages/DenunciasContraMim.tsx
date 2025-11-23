import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";

interface Denuncia {
  id: string;
  codigo_denuncia: string;
  url: string;
  preco_informado: number;
  observacoes: string | null;
  status: "Solicitada" | "Em andamento" | "Resolvida";
  comentario_admin: string | null;
  created_at: string;
  produto_id: string;
  marketplace_id: string;
  produtos: { nome: string; preco_minimo: number };
  marketplaces: { nome: string };
}

interface Produto {
  id: string;
  nome: string;
}

interface Marketplace {
  id: string;
  nome: string;
}

export default function DenunciasContraMim() {
  const { user } = useAuth();
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [produtoFilter, setProdutoFilter] = useState<string>("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");
  
  // Filter options
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchDenuncias();
  }, [statusFilter, produtoFilter, marketplaceFilter, user]);

  const fetchFilterOptions = async () => {
    try {
      // Fetch produtos
      const { data: produtosData, error: produtosError } = await supabase
        .from("produtos")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (produtosError) throw produtosError;
      setProdutos(produtosData || []);

      // Fetch marketplaces
      const { data: marketplacesData, error: marketplacesError } = await supabase
        .from("marketplaces")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (marketplacesError) throw marketplacesError;
      setMarketplaces(marketplacesData || []);
    } catch (error) {
      console.error("Erro ao buscar opções de filtro:", error);
    }
  };

  const fetchDenuncias = async () => {
    if (!user) return;
    
    try {
      let query = supabase
        .from("denuncias")
        .select(`
          *,
          produtos (nome, preco_minimo),
          marketplaces (nome)
        `)
        .eq("cliente_id", user.id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "Solicitada" | "Em andamento" | "Resolvida");
      }

      if (produtoFilter !== "all") {
        query = query.eq("produto_id", produtoFilter);
      }

      if (marketplaceFilter !== "all") {
        query = query.eq("marketplace_id", marketplaceFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDenuncias(data || []);
    } catch (error) {
      console.error("Erro ao buscar denúncias:", error);
      toast.error("Erro ao carregar denúncias");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Solicitada":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Em andamento":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Resolvida":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Carregando denúncias...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Denúncias Associadas a Mim</h1>
        <p className="text-muted-foreground">
          Visualize denúncias que foram associadas à sua conta pelos administradores
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Solicitada">Solicitada</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Resolvida">Resolvida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="produto-filter">Produto</Label>
              <Select value={produtoFilter} onValueChange={setProdutoFilter}>
                <SelectTrigger id="produto-filter">
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketplace-filter">Marketplace</Label>
              <Select value={marketplaceFilter} onValueChange={setMarketplaceFilter}>
                <SelectTrigger id="marketplace-filter">
                  <SelectValue placeholder="Todos os marketplaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {marketplaces.map((marketplace) => (
                    <SelectItem key={marketplace.id} value={marketplace.id}>
                      {marketplace.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {denuncias.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma denúncia encontrada</p>
            <p className="text-muted-foreground">
              Não há denúncias associadas à sua conta no momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Preço Informado</TableHead>
                    <TableHead>Preço Mín.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {denuncias.map((denuncia) => (
                    <TableRow key={denuncia.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {denuncia.codigo_denuncia}
                        </Badge>
                      </TableCell>
                      <TableCell>{denuncia.produtos.nome}</TableCell>
                      <TableCell>{denuncia.marketplaces.nome}</TableCell>
                      <TableCell>
                        <span
                          className={
                            denuncia.preco_informado < denuncia.produtos.preco_minimo
                              ? "font-bold text-destructive"
                              : "font-medium"
                          }
                        >
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(denuncia.preco_informado)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(denuncia.produtos.preco_minimo)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(denuncia.status)}>
                          {denuncia.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(denuncia.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(denuncia.url, "_blank")}
                          title="Ver anúncio original"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {denuncias.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • As denúncias listadas aqui foram associadas à sua conta pelos administradores.
            </p>
            <p>
              • Você pode visualizar os detalhes de cada denúncia, incluindo o produto e marketplace envolvidos.
            </p>
            <p>
              • Entre em contato com o suporte caso tenha dúvidas sobre alguma denúncia.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
