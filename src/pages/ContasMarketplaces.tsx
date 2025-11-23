import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2, Store, Building2, Filter, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ContaMarketplace {
  id: string;
  nome_conta: string;
  marketplace: string;
  cliente_id: string;
  created_at: string;
}

interface Cliente {
  id: string;
  name: string;
  empresa: string;
  email: string;
}

interface Marketplace {
  id: string;
  nome: string;
  logo_url: string | null;
}

interface ContaComCliente extends ContaMarketplace {
  cliente: Cliente | null;
  marketplace_info: Marketplace | null;
}

export default function ContasMarketplaces() {
  const [contas, setContas] = useState<ContaComCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [marketplacesData, setMarketplacesData] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [contasCliente, setContasCliente] = useState<{ nome: string; marketplace: string; cliente_id: string }[]>([]);
  
  // Filtros
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroMarketplace, setFiltroMarketplace] = useState("all");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  
  // Nova conta
  const [novaConta, setNovaConta] = useState({
    nome_conta: "",
    marketplace: "",
    cliente_id: ""
  });

  const marketplaces = ["Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas"];
  
  // Filtrar contas
  const contasFiltradas = contas.filter(conta => {
    const matchNome = conta.nome_conta.toLowerCase().includes(filtroNome.toLowerCase());
    const matchMarketplace = filtroMarketplace === "all" || !filtroMarketplace || conta.marketplace === filtroMarketplace;
    const matchCliente = !conta.cliente || conta.cliente.name.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchEmpresa = !conta.cliente || (conta.cliente.empresa || "").toLowerCase().includes(filtroEmpresa.toLowerCase());
    
    return matchNome && matchMarketplace && matchCliente && matchEmpresa;
  });

  useEffect(() => {
    fetchMarketplaces();
    fetchClientes();
  }, []);

  useEffect(() => {
    if (marketplacesData.length > 0) {
      fetchContas();
    }
  }, [marketplacesData]);

  const fetchMarketplaces = async () => {
    try {
      const { data, error } = await supabase
        .from("marketplaces")
        .select("id, nome, logo_url");

      if (error) throw error;
      setMarketplacesData(data || []);
    } catch (error) {
      console.error("Erro ao buscar marketplaces:", error);
    }
  };

  const fetchContas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contas_marketplace")
        .select(`
          id,
          nome_conta,
          marketplace,
          cliente_id,
          created_at,
          cliente:profiles!contas_marketplace_cliente_id_fkey (
            id,
            name,
            empresa,
            email
          )
        `)
        .order("nome_conta");

      if (error) throw error;

      const contasFormatadas = (data || []).map(conta => {
        const marketplaceInfo = marketplacesData.find(m => m.nome === conta.marketplace);
        return {
          ...conta,
          cliente: conta.cliente_id ? (conta.cliente as unknown as Cliente) : null,
          marketplace_info: marketplaceInfo || null
        };
      }) as ContaComCliente[];

      setContas(contasFormatadas);
    } catch (error) {
      console.error("Erro ao buscar contas:", error);
      toast.error("Erro ao carregar contas");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, empresa, email")
        .order("name");

      if (error) throw error;

      setClientes(data || []);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    }
  };

  const handleEdit = async (clienteId: string) => {
    setEditingClienteId(clienteId);
    
    // Buscar contas do cliente
    const { data, error } = await supabase
      .from("contas_marketplace")
      .select("nome_conta, marketplace, cliente_id")
      .eq("cliente_id", clienteId);

    if (error) {
      console.error("Erro ao buscar contas:", error);
      toast.error("Erro ao carregar contas do cliente");
      return;
    }

    setContasCliente(data?.map(c => ({ nome: c.nome_conta, marketplace: c.marketplace, cliente_id: c.cliente_id })) || []);
    setIsDialogOpen(true);
  };

  const addLoja = () => {
    setContasCliente([...contasCliente, { nome: "", marketplace: "", cliente_id: editingClienteId || "" }]);
  };

  const removeLoja = (index: number) => {
    setContasCliente(contasCliente.filter((_, i) => i !== index));
  };

  const updateLoja = (index: number, field: "nome" | "marketplace" | "cliente_id", value: string) => {
    const newContas = [...contasCliente];
    newContas[index][field] = value;
    setContasCliente(newContas);
  };

  const handleSave = async () => {
    if (!editingClienteId) return;

    try {
      // Validar que todas as contas têm cliente atribuído
      const contasSemCliente = contasCliente.filter(c => !c.cliente_id || !c.cliente_id.trim());
      if (contasSemCliente.length > 0) {
        toast.error("Todas as contas devem ter um cliente atribuído");
        return;
      }

      // Remover contas antigas do cliente
      const { error: deleteError } = await supabase
        .from("contas_marketplace")
        .delete()
        .eq("cliente_id", editingClienteId);

      if (deleteError) throw deleteError;

      // Adicionar novas contas válidas
      const contasValidas = contasCliente
        .filter(c => c.nome.trim() && c.marketplace && c.cliente_id)
        .map(c => ({
          nome_conta: c.nome,
          marketplace: c.marketplace,
          cliente_id: c.cliente_id
        }));

      if (contasValidas.length > 0) {
        const { error: insertError } = await supabase
          .from("contas_marketplace")
          .insert(contasValidas);

        if (insertError) throw insertError;
      }

      toast.success("Contas atualizadas com sucesso");
      setIsDialogOpen(false);
      fetchContas();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao atualizar contas");
    }
  };

  const handleAddConta = async () => {
    if (!novaConta.nome_conta.trim() || !novaConta.marketplace) {
      toast.error("Preencha o nome da conta e o marketplace");
      return;
    }

    try {
      const { error } = await supabase
        .from("contas_marketplace")
        .insert([{
          nome_conta: novaConta.nome_conta,
          marketplace: novaConta.marketplace,
          cliente_id: novaConta.cliente_id || null
        }]);

      if (error) throw error;

      toast.success("Conta adicionada com sucesso");
      setIsAddDialogOpen(false);
      setNovaConta({ nome_conta: "", marketplace: "", cliente_id: "" });
      fetchContas();
    } catch (error) {
      console.error("Erro ao adicionar conta:", error);
      toast.error("Erro ao adicionar conta");
    }
  };

  const limparFiltros = () => {
    setFiltroNome("");
    setFiltroMarketplace("all");
    setFiltroCliente("");
    setFiltroEmpresa("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contas Marketplaces</h1>
        <p className="text-muted-foreground">Visualize e edite as contas dos clientes nos marketplaces</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Clientes e suas Contas
              </CardTitle>
              <CardDescription>
                Lista de todos os clientes e suas lojas cadastradas nos marketplaces
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Conta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4" />
              Filtros
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filtro-nome">Nome da Conta</Label>
                <Input
                  id="filtro-nome"
                  placeholder="Filtrar por nome..."
                  value={filtroNome}
                  onChange={(e) => setFiltroNome(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-marketplace">Marketplace</Label>
                <Select value={filtroMarketplace} onValueChange={setFiltroMarketplace}>
                  <SelectTrigger id="filtro-marketplace">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {marketplaces.map((mp) => (
                      <SelectItem key={mp} value={mp}>
                        {mp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-cliente">Cliente</Label>
                <Input
                  id="filtro-cliente"
                  placeholder="Filtrar por cliente..."
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-empresa">Empresa</Label>
                <Input
                  id="filtro-empresa"
                  placeholder="Filtrar por empresa..."
                  value={filtroEmpresa}
                  onChange={(e) => setFiltroEmpresa(e.target.value)}
                />
              </div>
            </div>
            {(filtroNome || (filtroMarketplace && filtroMarketplace !== "all") || filtroCliente || filtroEmpresa) && (
              <Button variant="outline" size="sm" onClick={limparFiltros}>
                Limpar Filtros
              </Button>
            )}
          </div>
          {contasFiltradas.length === 0 ? (
            <Alert>
              <AlertDescription>
                {contas.length === 0 
                  ? "Nenhuma conta cadastrada ainda."
                  : "Nenhuma conta encontrada com os filtros aplicados."}
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Conta</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasFiltradas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.nome_conta}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {conta.marketplace_info?.logo_url ? (
                          <img 
                            src={conta.marketplace_info.logo_url} 
                            alt={conta.marketplace_info.nome}
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <Store className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{conta.marketplace_info?.nome || conta.marketplace}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {conta.cliente_id ? conta.cliente.name : (
                        <span className="text-muted-foreground italic">Sem cliente</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {conta.cliente_id ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {conta.cliente.empresa || "-"}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {conta.cliente_id ? conta.cliente.email : "-"}
                    </TableCell>
                    <TableCell>
                      {!conta.cliente_id ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertCircle className="h-3 w-3" />
                          Não associada
                        </Badge>
                      ) : (
                        <Badge variant="default" className="w-fit">
                          Associada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(conta.cliente_id)}
                        disabled={!conta.cliente_id}
                        title={conta.cliente_id ? "Editar contas do cliente" : "Associe a um cliente primeiro"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Contas do Marketplace</DialogTitle>
            <DialogDescription>
              {editingClienteId && clientes.find(c => c.id === editingClienteId)?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Lojas nos Marketplaces</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLoja}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Loja
              </Button>
            </div>

            {contasCliente.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Nenhuma loja cadastrada. Clique em "Adicionar Loja" para começar.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {contasCliente.map((conta, index) => (
                  <div key={index} className="flex gap-2 items-start border rounded-lg p-3">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`nome-${index}`}>Nome da Loja</Label>
                        <Input
                          id={`nome-${index}`}
                          placeholder="Nome da loja"
                          value={conta.nome}
                          onChange={(e) => updateLoja(index, "nome", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`marketplace-${index}`}>Marketplace</Label>
                        <Select
                          value={conta.marketplace}
                          onValueChange={(value) => updateLoja(index, "marketplace", value)}
                        >
                          <SelectTrigger id={`marketplace-${index}`}>
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
                      <div className="space-y-2">
                        <Label htmlFor={`cliente-${index}`}>Cliente</Label>
                        <Select
                          value={conta.cliente_id}
                          onValueChange={(value) => updateLoja(index, "cliente_id", value)}
                        >
                          <SelectTrigger id={`cliente-${index}`}>
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientes.map((cliente) => (
                              <SelectItem key={cliente.id} value={cliente.id}>
                                {cliente.name} - {cliente.empresa || cliente.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLoja(index)}
                      className="mt-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para adicionar nova conta */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Conta de Marketplace</DialogTitle>
            <DialogDescription>
              Preencha os dados da nova conta
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nova-nome">Nome da Conta *</Label>
              <Input
                id="nova-nome"
                placeholder="Nome da conta"
                value={novaConta.nome_conta}
                onChange={(e) => setNovaConta({ ...novaConta, nome_conta: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova-marketplace">Marketplace *</Label>
              <Select
                value={novaConta.marketplace}
                onValueChange={(value) => setNovaConta({ ...novaConta, marketplace: value })}
              >
                <SelectTrigger id="nova-marketplace">
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

            <div className="space-y-2">
              <Label htmlFor="nova-cliente">Cliente</Label>
              <Select
                value={novaConta.cliente_id}
                onValueChange={(value) => setNovaConta({ ...novaConta, cliente_id: value })}
              >
                <SelectTrigger id="nova-cliente">
                  <SelectValue placeholder="Selecione o cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.name} - {cliente.empresa || cliente.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Você pode associar o cliente depois
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddConta}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
