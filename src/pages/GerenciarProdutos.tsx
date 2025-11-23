import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Package, AlertCircle, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface Produto {
  id: string;
  nome: string;
  sku: string;
  preco_minimo: number;
  ativo: boolean;
  created_at: string;
  foto_url: string | null;
}

export default function GerenciarProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);

  // Form states
  const [nome, setNome] = useState("");
  const [sku, setSku] = useState("");
  const [precoMinimo, setPrecoMinimo] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
      setFotoPreview(produto.foto_url);
      setFotoFile(null);
    } else {
      setEditingProduto(null);
      setNome("");
      setSku("");
      setPrecoMinimo("");
      setFotoPreview(null);
      setFotoFile(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduto(null);
    setNome("");
    setSku("");
    setPrecoMinimo("");
    setFotoPreview(null);
    setFotoFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 5MB');
        return;
      }
      setFotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFoto = () => {
    setFotoFile(null);
    setFotoPreview(null);
  };

  const uploadFoto = async (produtoId: string): Promise<string | null> => {
    if (!fotoFile) return null;

    setUploading(true);
    try {
      const fileExt = fotoFile.name.split('.').pop();
      const fileName = `${produtoId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('produto-fotos')
        .upload(filePath, fotoFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('produto-fotos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      throw error;
    } finally {
      setUploading(false);
    }
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
      let fotoUrl: string | null = fotoPreview;

      if (editingProduto) {
        // Upload nova foto se houver
        if (fotoFile) {
          fotoUrl = await uploadFoto(editingProduto.id);
        }

        // Update
        const { error } = await supabase
          .from("produtos")
          .update({
            nome: nome.trim(),
            sku: sku.trim(),
            preco_minimo: preco,
            foto_url: fotoUrl,
          })
          .eq("id", editingProduto.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        // Insert
        const { data: newProduto, error: insertError } = await supabase
          .from("produtos")
          .insert({
            nome: nome.trim(),
            sku: sku.trim(),
            preco_minimo: preco,
            ativo: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Upload foto se houver
        if (fotoFile && newProduto) {
          fotoUrl = await uploadFoto(newProduto.id);
          
          // Atualizar com a URL da foto
          const { error: updateError } = await supabase
            .from("produtos")
            .update({ foto_url: fotoUrl })
            .eq("id", newProduto.id);

          if (updateError) throw updateError;
        }

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

  const handleOpenDeleteDialog = (produto: Produto) => {
    setProdutoToDelete(produto);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!produtoToDelete) return;

    try {
      const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", produtoToDelete.id);

      if (error) throw error;

      toast.success("Produto excluído com sucesso!");
      setDeleteDialogOpen(false);
      setProdutoToDelete(null);
      fetchProdutos();
    } catch (error: any) {
      console.error("Erro ao excluir produto:", error);
      if (error.code === "23503") {
        toast.error("Não é possível excluir. Este produto está vinculado a anúncios.");
      } else {
        toast.error("Erro ao excluir produto");
      }
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
                <Label>Foto do Produto</Label>
                <div className="flex items-start gap-4">
                  {fotoPreview ? (
                    <div className="relative">
                      <img 
                        src={fotoPreview} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={handleRemoveFoto}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG ou WEBP (máx. 5MB)
                    </p>
                  </div>
                </div>
              </div>

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
              <Button onClick={handleSave} disabled={saving || uploading}>
                {saving || uploading ? "Salvando..." : "Salvar"}
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
                    <TableHead>Foto</TableHead>
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
                      <TableCell>
                        {produto.foto_url ? (
                          <img 
                            src={produto.foto_url} 
                            alt={produto.nome}
                            className="w-12 h-12 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteDialog(produto)}
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{produtoToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
