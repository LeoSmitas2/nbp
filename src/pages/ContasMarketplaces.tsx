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
import { Pencil, Plus, Trash2, Store, Building2 } from "lucide-react";
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

interface ContaComCliente extends ContaMarketplace {
  cliente: Cliente;
}

export default function ContasMarketplaces() {
  const [contas, setContas] = useState<ContaComCliente[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [contasCliente, setContasCliente] = useState<{ nome: string; marketplace: string }[]>([]);

  const marketplaces = ["Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas"];

  useEffect(() => {
    fetchContas();
    fetchClientes();
  }, []);

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

      const contasFormatadas = (data || []).map(conta => ({
        ...conta,
        cliente: conta.cliente as unknown as Cliente
      })) as ContaComCliente[];

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
      .select("nome_conta, marketplace")
      .eq("cliente_id", clienteId);

    if (error) {
      console.error("Erro ao buscar contas:", error);
      toast.error("Erro ao carregar contas do cliente");
      return;
    }

    setContasCliente(data?.map(c => ({ nome: c.nome_conta, marketplace: c.marketplace })) || []);
    setIsDialogOpen(true);
  };

  const addLoja = () => {
    setContasCliente([...contasCliente, { nome: "", marketplace: "" }]);
  };

  const removeLoja = (index: number) => {
    setContasCliente(contasCliente.filter((_, i) => i !== index));
  };

  const updateLoja = (index: number, field: "nome" | "marketplace", value: string) => {
    const newContas = [...contasCliente];
    newContas[index][field] = value;
    setContasCliente(newContas);
  };

  const handleSave = async () => {
    if (!editingClienteId) return;

    try {
      // Remover contas antigas do cliente
      const { error: deleteError } = await supabase
        .from("contas_marketplace")
        .delete()
        .eq("cliente_id", editingClienteId);

      if (deleteError) throw deleteError;

      // Adicionar novas contas válidas
      const contasValidas = contasCliente
        .filter(c => c.nome.trim() && c.marketplace)
        .map(c => ({
          nome_conta: c.nome,
          marketplace: c.marketplace,
          cliente_id: editingClienteId
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
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Clientes e suas Contas
          </CardTitle>
          <CardDescription>
            Lista de todos os clientes e suas lojas cadastradas nos marketplaces
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contas.length === 0 ? (
            <Alert>
              <AlertDescription>Nenhuma conta cadastrada ainda.</AlertDescription>
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
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.nome_conta}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        {conta.marketplace}
                      </div>
                    </TableCell>
                    <TableCell>{conta.cliente.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {conta.cliente.empresa || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{conta.cliente.email}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(conta.cliente_id)}
                        title="Editar contas do cliente"
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
    </div>
  );
}
