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
import { Plus, ExternalLink, TrendingDown, TrendingUp, AlertCircle, Edit, Store } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
  codigo_marketplace: string | null;
  profiles: { name: string; empresa: string | null } | null;
  produtos: { nome: string };
  marketplaces: { nome: string; logo_url: string | null };
  conta_marketplace?: {
    id: string;
    nome_conta: string;
    marketplace: string;
  };
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

interface ContaMarketplace {
  id: string;
  nome_conta: string;
  marketplace: string;
}

export default function GerenciarAnuncios() {
  const navigate = useNavigate();
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAnuncio, setEditingAnuncio] = useState<Anuncio | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [produtoFilter, setProdutoFilter] = useState<string>("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [contaFilter, setContaFilter] = useState<string>("all");

  // Filter options
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [contasMarketplace, setContasMarketplace] = useState<ContaMarketplace[]>([]);

  // Form states
  const [url, setUrl] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [marketplaceId, setMarketplaceId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [precoDetectado, setPrecoDetectado] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [contaMarketplaceId, setContaMarketplaceId] = useState("");

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchAnuncios();
  }, [statusFilter, produtoFilter, marketplaceFilter, clienteFilter, contaFilter]);

  const fetchFilterOptions = async () => {
    try {
      const [clientesData, produtosData, marketplacesData, contasData] = await Promise.all([
        supabase.from("profiles").select("id, name, empresa").order("name"),
        supabase.from("produtos").select("id, nome, preco_minimo").eq("ativo", true).order("nome"),
        supabase.from("marketplaces").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("contas_marketplace").select("id, nome_conta, marketplace").order("nome_conta"),
      ]);

      setClientes(clientesData.data || []);
      setProdutos(produtosData.data || []);
      setMarketplaces(marketplacesData.data || []);
      setContasMarketplace(contasData.data || []);
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

      // Buscar contas de marketplace para cada anúncio
      const anunciosComContas = await Promise.all(
        (data || []).map(async (anuncio: any) => {
          if (anuncio.codigo_marketplace && anuncio.marketplaces?.nome) {
            const { data: contaData } = await supabase
              .from("contas_marketplace")
              .select("id, nome_conta, marketplace")
              .eq("marketplace", anuncio.marketplaces.nome)
              .limit(1)
              .maybeSingle();

            return {
              ...anuncio,
              conta_marketplace: contaData || undefined,
            };
          }
          return anuncio;
        })
      );

      // Aplicar filtro de conta
      let anunciosFiltrados = anunciosComContas;
      if (contaFilter !== "all") {
        anunciosFiltrados = anunciosComContas.filter(
          (a: any) => a.conta_marketplace?.id === contaFilter
        );
      }

      setAnuncios(anunciosFiltrados as Anuncio[]);
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

  const handleOpenEdit = (anuncio: Anuncio) => {
    setEditingAnuncio(anuncio);
    setUrl(anuncio.url);
    setProdutoId(anuncio.produto_id);
    setMarketplaceId(anuncio.marketplace_id);
    setClienteId(anuncio.cliente_id || "");
    setPrecoDetectado(anuncio.preco_detectado.toString());
    setContaMarketplaceId(anuncio.conta_marketplace?.id || "");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAnuncio || !url.trim() || !produtoId || !marketplaceId || !precoDetectado) {
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
      const { error } = await supabase
        .from("anuncios_monitorados")
        .update({
          url: url.trim(),
          produto_id: produtoId,
          marketplace_id: marketplaceId,
          cliente_id: clienteId || null,
          preco_detectado: preco,
          preco_minimo: produtoSelecionado.preco_minimo,
          status: preco < produtoSelecionado.preco_minimo ? "Abaixo do mínimo" : "OK",
        })
        .eq("id", editingAnuncio.id);

      if (error) throw error;

      toast.success("Anúncio atualizado com sucesso!");
      setEditDialogOpen(false);
      setEditingAnuncio(null);
      fetchAnuncios();
    } catch (error) {
      console.error("Erro ao atualizar anúncio:", error);
      toast.error("Erro ao atualizar anúncio");
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
        <Button onClick={() => navigate("/adicionar-anuncio")}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Anúncio
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="conta-filter">Conta</Label>
              <Select value={contaFilter} onValueChange={setContaFilter}>
                <SelectTrigger id="conta-filter">
                  <SelectValue placeholder="Todas as contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {contasMarketplace.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      {conta.nome_conta} ({conta.marketplace})
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
                    <TableHead>Conta</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Preço Detectado</TableHead>
                    <TableHead>Preço Mínimo</TableHead>
                    <TableHead>Diferença</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Atualização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anuncios.map((anuncio) => {
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
                          {anuncio.conta_marketplace ? (
                            <div className="flex items-center gap-1">
                              <Store className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{anuncio.conta_marketplace.nome_conta}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
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
                          {anuncio.preco_detectado < anuncio.preco_minimo ? (
                            <div className="flex items-center gap-1 text-red-600">
                              <TrendingDown className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(anuncio.preco_detectado - anuncio.preco_minimo)}{" "}
                                ({(((anuncio.preco_detectado - anuncio.preco_minimo) / anuncio.preco_minimo) * 100).toFixed(1)}%)
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
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
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(anuncio)}
                              title="Editar anúncio"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(anuncio.url, "_blank")}
                              title="Ver anúncio"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Anúncio</DialogTitle>
            <DialogDescription>
              Atualize as informações do anúncio monitorado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-url">URL do Anúncio *</Label>
              <Input
                id="edit-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-produto">Produto *</Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger id="edit-produto">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map((produto) => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome} (R$ {produto.preco_minimo.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-marketplace">Marketplace *</Label>
                <Select value={marketplaceId} onValueChange={setMarketplaceId}>
                  <SelectTrigger id="edit-marketplace">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cliente">Cliente</Label>
                <Select value={clienteId || "none"} onValueChange={(value) => setClienteId(value === "none" ? "" : value)}>
                  <SelectTrigger id="edit-cliente">
                    <SelectValue placeholder="Selecione o cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.name}
                        {cliente.empresa && ` (${cliente.empresa})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-preco">Preço Detectado *</Label>
                <Input
                  id="edit-preco"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoDetectado}
                  onChange={(e) => setPrecoDetectado(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
