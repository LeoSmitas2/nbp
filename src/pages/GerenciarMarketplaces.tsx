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
import { Plus, Edit, Store, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Marketplace {
  id: string;
  nome: string;
  url_base: string;
  ativo: boolean;
  created_at: string;
}

export default function GerenciarMarketplaces() {
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMarketplace, setEditingMarketplace] = useState<Marketplace | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [nome, setNome] = useState("");
  const [urlBase, setUrlBase] = useState("");

  useEffect(() => {
    fetchMarketplaces();
  }, []);

  const fetchMarketplaces = async () => {
    try {
      const { data, error } = await supabase
        .from("marketplaces")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMarketplaces(data || []);
    } catch (error) {
      console.error("Erro ao buscar marketplaces:", error);
      toast.error("Erro ao carregar marketplaces");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (marketplace?: Marketplace) => {
    if (marketplace) {
      setEditingMarketplace(marketplace);
      setNome(marketplace.nome);
      setUrlBase(marketplace.url_base);
    } else {
      setEditingMarketplace(null);
      setNome("");
      setUrlBase("");
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMarketplace(null);
    setNome("");
    setUrlBase("");
  };

  const handleSave = async () => {
    if (!nome.trim() || !urlBase.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Validate URL format
    try {
      new URL(urlBase);
    } catch {
      toast.error("URL inválida. Use o formato: https://exemplo.com");
      return;
    }

    setSaving(true);
    try {
      if (editingMarketplace) {
        // Update
        const { error } = await supabase
          .from("marketplaces")
          .update({
            nome: nome.trim(),
            url_base: urlBase.trim(),
          })
          .eq("id", editingMarketplace.id);

        if (error) throw error;
        toast.success("Marketplace atualizado com sucesso!");
      } else {
        // Insert
        const { error } = await supabase
          .from("marketplaces")
          .insert({
            nome: nome.trim(),
            url_base: urlBase.trim(),
            ativo: true,
          });

        if (error) throw error;
        toast.success("Marketplace cadastrado com sucesso!");
      }

      handleCloseDialog();
      fetchMarketplaces();
    } catch (error: any) {
      console.error("Erro ao salvar marketplace:", error);
      toast.error("Erro ao salvar marketplace");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (marketplace: Marketplace) => {
    try {
      const { error } = await supabase
        .from("marketplaces")
        .update({ ativo: !marketplace.ativo })
        .eq("id", marketplace.id);

      if (error) throw error;

      toast.success(
        marketplace.ativo ? "Marketplace desativado" : "Marketplace ativado"
      );
      fetchMarketplaces();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do marketplace");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Carregando marketplaces...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerenciar Marketplaces</h1>
          <p className="text-muted-foreground">
            Cadastre e gerencie as plataformas de venda
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Marketplace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMarketplace ? "Editar Marketplace" : "Novo Marketplace"}
              </DialogTitle>
              <DialogDescription>
                {editingMarketplace
                  ? "Atualize as informações do marketplace"
                  : "Cadastre uma nova plataforma de venda"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Marketplace *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Mercado Livre"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL Base *</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://www.mercadolivre.com.br"
                  value={urlBase}
                  onChange={(e) => setUrlBase(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  URL principal da plataforma (incluindo https://)
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

      {marketplaces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhum marketplace cadastrado ainda
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeiro Marketplace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Marketplaces Cadastrados ({marketplaces.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>URL Base</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketplaces.map((marketplace) => (
                    <TableRow key={marketplace.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          {marketplace.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={marketplace.url_base}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline text-sm"
                        >
                          {marketplace.url_base}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={marketplace.ativo ? "default" : "secondary"}
                        >
                          {marketplace.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(marketplace.created_at).toLocaleDateString(
                          "pt-BR"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(marketplace)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center gap-2 border-l pl-2">
                            <Switch
                              checked={marketplace.ativo}
                              onCheckedChange={() =>
                                handleToggleAtivo(marketplace)
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {marketplace.ativo ? "Ativo" : "Inativo"}
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
