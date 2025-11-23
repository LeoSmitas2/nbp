import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Edit, CheckCircle2, AlertCircle } from "lucide-react";
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
  cliente_id: string;
  produto_id: string;
  marketplace_id: string;
  profiles: { name: string; empresa: string | null };
  produtos: { nome: string; preco_minimo: number };
  marketplaces: { nome: string };
}

interface Cliente {
  id: string;
  name: string;
  empresa: string | null;
}

interface Produto {
  id: string;
  nome: string;
}

interface Marketplace {
  id: string;
  nome: string;
}

export default function GerenciarDenuncias() {
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDenuncia, setEditingDenuncia] = useState<Denuncia | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const [produtoFilter, setProdutoFilter] = useState<string>("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all");
  
  // Filter options
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  
  // Form states for editing
  const [editStatus, setEditStatus] = useState<string>("");
  const [editComentario, setEditComentario] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchDenuncias();
  }, [statusFilter, clienteFilter, produtoFilter, marketplaceFilter]);

  const fetchFilterOptions = async () => {
    try {
      // Fetch clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("profiles")
        .select("id, name, empresa")
        .order("name");

      if (clientesError) throw clientesError;
      setClientes(clientesData || []);

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
    try {
      let query = supabase
        .from("denuncias")
        .select(`
          *,
          profiles!denuncias_cliente_id_fkey (name, empresa),
          produtos (nome, preco_minimo),
          marketplaces (nome)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as "Solicitada" | "Em andamento" | "Resolvida");
      }

      if (clienteFilter !== "all") {
        query = query.eq("cliente_id", clienteFilter);
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

  const handleEdit = (denuncia: Denuncia) => {
    setEditingDenuncia(denuncia);
    setEditStatus(denuncia.status);
    setEditComentario(denuncia.comentario_admin || "");
  };

  const handleSave = async () => {
    if (!editingDenuncia) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("denuncias")
        .update({
          status: editStatus as "Solicitada" | "Em andamento" | "Resolvida",
          comentario_admin: editComentario || null,
        })
        .eq("id", editingDenuncia.id);

      if (error) throw error;

      toast.success("Denúncia atualizada com sucesso!");
      setEditingDenuncia(null);
      fetchDenuncias();
    } catch (error) {
      console.error("Erro ao atualizar denúncia:", error);
      toast.error("Erro ao atualizar denúncia");
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToAnuncio = async (denuncia: Denuncia) => {
    try {
      // Insert into anuncios_monitorados
      const { error: insertError } = await supabase
        .from("anuncios_monitorados")
        .insert({
          produto_id: denuncia.produto_id,
          marketplace_id: denuncia.marketplace_id,
          url: denuncia.url,
          preco_detectado: denuncia.preco_informado,
          preco_minimo: denuncia.produtos.preco_minimo,
          cliente_id: denuncia.cliente_id,
          origem: "Denúncia",
          status: denuncia.preco_informado < denuncia.produtos.preco_minimo ? "Abaixo do mínimo" : "OK",
        });

      if (insertError) throw insertError;

      toast.success("Denúncia convertida em anúncio monitorado!");
      fetchDenuncias();
    } catch (error) {
      console.error("Erro ao converter denúncia:", error);
      toast.error("Erro ao converter denúncia");
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
        <h1 className="text-3xl font-bold mb-2">Gerenciar Denúncias</h1>
        <p className="text-muted-foreground">
          Analise e gerencie todas as denúncias do sistema
        </p>
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
                  <SelectItem value="Solicitada">Solicitada</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Resolvida">Resolvida</SelectItem>
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
            <p className="text-muted-foreground">Nenhuma denúncia encontrada</p>
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
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Preço</TableHead>
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
                      <TableCell>
                        <div>
                          <p className="font-medium">{denuncia.profiles.name}</p>
                          {denuncia.profiles.empresa && (
                            <p className="text-xs text-muted-foreground">
                              {denuncia.profiles.empresa}
                            </p>
                          )}
                        </div>
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
                        {new Date(denuncia.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(denuncia.url, "_blank")}
                            title="Ver anúncio"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(denuncia)}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Editar Denúncia</DialogTitle>
                                <DialogDescription>
                                  Atualize o status e adicione comentários
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Cliente:</span>{" "}
                                    {denuncia.profiles.name}
                                  </div>
                                  <div>
                                    <span className="font-medium">Produto:</span>{" "}
                                    {denuncia.produtos.nome}
                                  </div>
                                  <div>
                                    <span className="font-medium">Marketplace:</span>{" "}
                                    {denuncia.marketplaces.nome}
                                  </div>
                                  <div>
                                    <span className="font-medium">Preço:</span>{" "}
                                    {new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(denuncia.preco_informado)}
                                  </div>
                                </div>

                                {denuncia.observacoes && (
                                  <div>
                                    <Label>Observações do Cliente</Label>
                                    <p className="text-sm text-muted-foreground mt-1 p-2 bg-muted rounded">
                                      {denuncia.observacoes}
                                    </p>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <Label htmlFor="edit-status">Status</Label>
                                  <Select
                                    value={editStatus}
                                    onValueChange={setEditStatus}
                                  >
                                    <SelectTrigger id="edit-status">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Solicitada">Solicitada</SelectItem>
                                      <SelectItem value="Em andamento">
                                        Em andamento
                                      </SelectItem>
                                      <SelectItem value="Resolvida">Resolvida</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="edit-comentario">
                                    Comentário do Admin
                                  </Label>
                                  <Textarea
                                    id="edit-comentario"
                                    value={editComentario}
                                    onChange={(e) => setEditComentario(e.target.value)}
                                    placeholder="Adicione observações sobre o andamento..."
                                    rows={4}
                                  />
                                </div>
                              </div>

                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingDenuncia(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button onClick={handleSave} disabled={saving}>
                                  {saving ? "Salvando..." : "Salvar Alterações"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {denuncia.status === "Resolvida" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleConvertToAnuncio(denuncia)}
                              title="Adicionar aos anúncios monitorados"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
