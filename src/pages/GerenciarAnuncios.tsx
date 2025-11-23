import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ExternalLink, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Anuncio {
  id: string;
  url: string;
  preco_detectado: number;
  preco_minimo: number;
  origem: "Denúncia" | "Manual";
  status: "OK" | "Abaixo do mínimo";
  ultima_atualizacao: string;
  cliente_id: string | null;
  produto_id: string;
  marketplace_id: string;
  profiles: { name: string; empresa: string | null } | null;
  produtos: { nome: string };
  marketplaces: { nome: string; logo_url: string | null };
}

interface Cliente {
  id: string;
  name: string;
  empresa: string | null;
}

interface Produto {
  id: string;
  nome: string;
  preco_minimo: number;
}

interface Marketplace {
  id: string;
  nome: string;
}

export default function GerenciarAnuncios() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [produtoFilter, setProdutoFilter] = useState<string>("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");
  const [clienteFilter, setClienteFilter] = useState<string>("all");

  // Filter options
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);

  // Form states
  const [url, setUrl] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [marketplaceId, setMarketplaceId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [precoDetectado, setPrecoDetectado] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchAnuncios();
  }, [statusFilter, produtoFilter, marketplaceFilter, clienteFilter]);

  const fetchFilterOptions = async () => {
    try {
      const [clientesData, produtosData, marketplacesData] = await Promise.all([
        supabase.from("profiles").select("id, name, empresa").order("name"),
        supabase.from("produtos").select("id, nome, preco_minimo").eq("ativo", true).order("nome"),
        supabase.from("marketplaces").select("id, nome").eq("ativo", true).order("nome"),
      ]);

      setClientes(clientesData.data || []);
      setProdutos(produtosData.data || []);
      setMarketplaces(marketplacesData.data || []);
    } catch (error) {
      console.error("Erro ao buscar opções de filtro:", error);
    }
  };

  const fetchAnuncios = async () => {
    try {
      let query = supabase
        .from("anuncios_monitorados")
        .select(`
          *,
          profiles:cliente_id (name, empresa),
          produtos (nome),
          marketplaces (nome, logo_url)
        `)
        .order("ultima_atualizacao", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "OK" | "Abaixo do mínimo");
      }
      if (produtoFilter !== "all") {
        query = query.eq("produto_id", produtoFilter);
      }
      if (marketplaceFilter !== "all") {
        query = query.eq("marketplace_id", marketplaceFilter);
      }
      if (clienteFilter !== "all") {
        query = query.eq("cliente_id", clienteFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnuncios(data || []);
    } catch (error) {
      console.error("Erro ao buscar anúncios:", error);
      toast.error("Erro ao carregar anúncios");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setUrl("");
    setProdutoId("");
    setMarketplaceId("");
    setClienteId("");
    setPrecoDetectado("");
    setObservacoes("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!url.trim() || !produtoId || !marketplaceId || !precoDetectado) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const preco = parseFloat(precoDetectado);
    if (isNaN(preco) || preco <= 0) {
      toast.error("Preço inválido");
      return;
    }

    const produtoSelecionado = produtos.find((p) => p.id === produtoId);
    if (!produtoSelecionado) {
      toast.error("Produto não encontrado");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("anuncios_monitorados").insert({
        url: url.trim(),
        produto_id: produtoId,
        marketplace_id: marketplaceId,
        cliente_id: clienteId || null,
        preco_detectado: preco,
        preco_minimo: produtoSelecionado.preco_minimo,
        origem: "Manual",
        status: preco < produtoSelecionado.preco_minimo ? "Abaixo do mínimo" : "OK",
      });

      if (error) throw error;

      toast.success("Anúncio adicionado com sucesso!");
      setDialogOpen(false);
      fetchAnuncios();
    } catch (error) {
      console.error("Erro ao adicionar anúncio:", error);
      toast.error("Erro ao adicionar anúncio");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === "OK"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const getOrigemColor = (origem: string) => {
    return origem === "Manual"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Carregando anúncios...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Anúncios Monitorados</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os anúncios do sistema
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Anúncio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Anúncio Manualmente</DialogTitle>
              <DialogDescription>
                Cadastre um novo anúncio para monitoramento
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="url">Link do Anúncio *</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://exemplo.com/produto/123"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="produto">Produto *</Label>
                  <Select value={produtoId} onValueChange={setProdutoId}>
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
                  <Select value={marketplaceId} onValueChange={setMarketplaceId}>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco">Preço Detectado (R$) *</Label>
                  <Input
                    id="preco"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={precoDetectado}
                    onChange={(e) => setPrecoDetectado(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente (opcional)</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger id="cliente">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.name}
                          {cliente.empresa && ` (${cliente.empresa})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs">Observações (opcional)</Label>
                <Textarea
                  id="obs"
                  placeholder="Informações adicionais sobre este anúncio..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Adicionar Anúncio"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="Abaixo do mínimo">Abaixo do mínimo</SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="cliente-filter">Cliente</Label>
              <Select value={clienteFilter} onValueChange={setClienteFilter}>
                <SelectTrigger id="cliente-filter">
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.name}
                      {cliente.empresa && ` (${cliente.empresa})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {anuncios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum anúncio encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Anúncios ({anuncios.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Preço Detectado</TableHead>
                    <TableHead>Preço Mínimo</TableHead>
                    <TableHead>Diferença</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Atualização</TableHead>
                    <TableHead className="text-right">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anuncios.map((anuncio) => {
                    const diferenca = anuncio.preco_detectado - anuncio.preco_minimo;
                    const percentual = ((diferenca / anuncio.preco_minimo) * 100).toFixed(1);

                    return (
                      <TableRow key={anuncio.id}>
                        <TableCell className="font-medium">
                          {anuncio.produtos.nome}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {anuncio.marketplaces.logo_url && (
                              <img
                                src={anuncio.marketplaces.logo_url}
                                alt={anuncio.marketplaces.nome}
                                className="h-5 w-5 object-contain"
                              />
                            )}
                            {anuncio.marketplaces.nome}
                          </div>
                        </TableCell>
                        <TableCell>
                          {anuncio.profiles ? (
                            <div>
                              <p className="text-sm">{anuncio.profiles.name}</p>
                              {anuncio.profiles.empresa && (
                                <p className="text-xs text-muted-foreground">
                                  {anuncio.profiles.empresa}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(anuncio.preco_detectado)}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(anuncio.preco_minimo)}
                        </TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center gap-1 ${
                              diferenca < 0 ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {diferenca < 0 ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <TrendingUp className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">
                              {diferenca < 0 ? "" : "+"}
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(diferenca)}{" "}
                              ({percentual}%)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(anuncio.status)}>
                            {anuncio.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getOrigemColor(anuncio.origem)}>
                            {anuncio.origem}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(anuncio.ultima_atualizacao).toLocaleDateString(
                            "pt-BR"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(anuncio.url, "_blank")}
                            title="Ver anúncio"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
