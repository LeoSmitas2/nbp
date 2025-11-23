import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Package, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Produto {
  id: string;
  nome: string;
  sku: string;
  preco_minimo: number;
  ativo: boolean;
  created_at: string;
}

export default function GerenciarProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [nome, setNome] = useState("");
  const [sku, setSku] = useState("");
  const [precoMinimo, setPrecoMinimo] = useState("");

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (produto?: Produto) => {
    if (produto) {
      setEditingProduto(produto);
      setNome(produto.nome);
      setSku(produto.sku);
      setPrecoMinimo(produto.preco_minimo.toString());
    } else {
      setEditingProduto(null);
      setNome("");
      setSku("");
      setPrecoMinimo("");
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduto(null);
    setNome("");
    setSku("");
    setPrecoMinimo("");
  };

  const handleSave = async () => {
    if (!nome.trim() || !sku.trim() || !precoMinimo) {
      toast.error("Preencha todos os campos");
      return;
    }

    const preco = parseFloat(precoMinimo);
    if (isNaN(preco) || preco <= 0) {
      toast.error("Preço mínimo inválido");
      return;
    }

    setSaving(true);
    try {
      if (editingProduto) {
        // Update
        const { error } = await supabase
          .from("produtos")
          .update({
            nome: nome.trim(),
            sku: sku.trim(),
            preco_minimo: preco,
          })
          .eq("id", editingProduto.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        // Insert
        const { error } = await supabase
          .from("produtos")
          .insert({
            nome: nome.trim(),
            sku: sku.trim(),
            preco_minimo: preco,
            ativo: true,
          });

        if (error) throw error;
        toast.success("Produto cadastrado com sucesso!");
      }

      handleCloseDialog();
      fetchProdutos();
    } catch (error: any) {
      console.error("Erro ao salvar produto:", error);
      if (error.code === "23505") {
        toast.error("SKU já cadastrado. Use um SKU único.");
      } else {
        toast.error("Erro ao salvar produto");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (produto: Produto) => {
    try {
      const { error } = await supabase
        .from("produtos")
        .update({ ativo: !produto.ativo })
        .eq("id", produto.id);

      if (error) throw error;

      toast.success(
        produto.ativo ? "Produto desativado" : "Produto ativado"
      );
      fetchProdutos();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do produto");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Carregando produtos...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerenciar Produtos</h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie os produtos monitorados
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduto ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
              <DialogDescription>
                {editingProduto
                  ? "Atualize as informações do produto"
                  : "Cadastre um novo produto para monitoramento"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Produto *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Notebook Dell Inspiron 15"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  placeholder="Ex: DELL-INS15-I5-8GB"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Código único de identificação do produto
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preco">Preço Mínimo (R$) *</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={precoMinimo}
                  onChange={(e) => setPrecoMinimo(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Valor mínimo permitido para venda do produto
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {produtos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhum produto cadastrado ainda
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos Cadastrados ({produtos.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Preço Mínimo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">
                        {produto.nome}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {produto.sku}
                        </code>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(produto.preco_minimo)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={produto.ativo ? "default" : "secondary"}
                        >
                          {produto.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(produto.created_at).toLocaleDateString(
                          "pt-BR"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(produto)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-2 border-l pl-2">
                            <Switch
                              checked={produto.ativo}
                              onCheckedChange={() => handleToggleAtivo(produto)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {produto.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </div>
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
