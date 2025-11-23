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

interface Loja {
  nome: string;
  marketplace: string;
}

interface Cliente {
  id: string;
  name: string;
  empresa: string;
  email: string;
  lojas_marketplaces: Loja[];
}

interface ContaExpandida {
  nomeConta: string;
  marketplace: string;
  clienteId: string;
  clienteNome: string;
  clienteEmpresa: string;
  clienteEmail: string;
}

export default function ContasMarketplaces() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [contasExpandidas, setContasExpandidas] = useState<ContaExpandida[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [lojas, setLojas] = useState<Loja[]>([]);

  const marketplaces = ["Mercado Livre", "Shopee", "Amazon", "Magalu", "Americanas"];

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, empresa, email, lojas_marketplaces")
        .order("name");

      if (error) throw error;

      const clientesFormatados = (data || []).map(cliente => ({
        ...cliente,
        lojas_marketplaces: Array.isArray(cliente.lojas_marketplaces) 
          ? (cliente.lojas_marketplaces as unknown as Loja[])
          : []
      }));

      setClientes(clientesFormatados);

      // Expandir as contas para uma linha por loja
      const contas: ContaExpandida[] = [];
      clientesFormatados.forEach(cliente => {
        if (Array.isArray(cliente.lojas_marketplaces) && cliente.lojas_marketplaces.length > 0) {
          cliente.lojas_marketplaces.forEach(loja => {
            contas.push({
              nomeConta: loja.nome,
              marketplace: loja.marketplace,
              clienteId: cliente.id,
              clienteNome: cliente.name,
              clienteEmpresa: cliente.empresa || "-",
              clienteEmail: cliente.email
            });
          });
        }
      });
      setContasExpandidas(contas);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setLojas(Array.isArray(cliente.lojas_marketplaces) ? cliente.lojas_marketplaces : []);
    setIsDialogOpen(true);
  };

  const addLoja = () => {
    setLojas([...lojas, { nome: "", marketplace: "" }]);
  };

  const removeLoja = (index: number) => {
    setLojas(lojas.filter((_, i) => i !== index));
  };

  const updateLoja = (index: number, field: "nome" | "marketplace", value: string) => {
    const newLojas = [...lojas];
    newLojas[index][field] = value;
    setLojas(newLojas);
  };

  const handleSave = async () => {
    if (!editingCliente) return;

    try {
      const lojasValidas = lojas.filter(l => l.nome.trim() && l.marketplace);

      const { error } = await supabase
        .from("profiles")
        .update({ lojas_marketplaces: lojasValidas as any })
        .eq("id", editingCliente.id);

      if (error) throw error;

      toast.success("Contas atualizadas com sucesso");
      setIsDialogOpen(false);
      fetchClientes();
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
          {contasExpandidas.length === 0 ? (
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
                {contasExpandidas.map((conta, index) => (
                  <TableRow key={`${conta.clienteId}-${index}`}>
                    <TableCell className="font-medium">{conta.nomeConta}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        {conta.marketplace}
                      </div>
                    </TableCell>
                    <TableCell>{conta.clienteNome}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {conta.clienteEmpresa}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{conta.clienteEmail}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const cliente = clientes.find(c => c.id === conta.clienteId);
                          if (cliente) handleEdit(cliente);
                        }}
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
              Cliente: {editingCliente?.name} - {editingCliente?.empresa}
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

            {lojas.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Nenhuma loja cadastrada. Clique em "Adicionar Loja" para começar.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {lojas.map((loja, index) => (
                  <div key={index} className="flex gap-2 items-start border rounded-lg p-3">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`nome-${index}`}>Nome da Loja</Label>
                        <Input
                          id={`nome-${index}`}
                          placeholder="Nome da loja"
                          value={loja.nome}
                          onChange={(e) => updateLoja(index, "nome", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`marketplace-${index}`}>Marketplace</Label>
                        <Select
                          value={loja.marketplace}
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
