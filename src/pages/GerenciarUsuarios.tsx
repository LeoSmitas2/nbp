import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CheckCircle, XCircle, Edit, Shield, UserX, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Usuario {
  id: string;
  name: string;
  email: string;
  empresa: string | null;
  cnpj: string | null;
  username: string | null;
  created_at: string;
  user_roles: {
    role: "ADMIN" | "CLIENT";
    status: "Pendente" | "Aprovado" | "Rejeitado";
  }[];
}

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Edit form states
  const [editName, setEditName] = useState("");
  const [editEmpresa, setEditEmpresa] = useState("");
  const [editRole, setEditRole] = useState<"ADMIN" | "CLIENT">("CLIENT");

  useEffect(() => {
    fetchUsuarios();
  }, [statusFilter, roleFilter]);

  const fetchUsuarios = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select(`
          *,
          user_roles (role, status)
        `)
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Apply filters
      if (statusFilter !== "all") {
        filteredData = filteredData.filter(
          (u) => u.user_roles[0]?.status === statusFilter
        );
      }

      if (roleFilter !== "all") {
        filteredData = filteredData.filter(
          (u) => u.user_roles[0]?.role === roleFilter
        );
      }

      setUsuarios(filteredData);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async (usuario: Usuario) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ status: "Aprovado" })
        .eq("user_id", usuario.id);

      if (error) throw error;

      toast.success(`Usuário ${usuario.name} aprovado!`);
      fetchUsuarios();
    } catch (error) {
      console.error("Erro ao aprovar usuário:", error);
      toast.error("Erro ao aprovar usuário");
    }
  };

  const handleRejeitar = async (usuario: Usuario) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ status: "Rejeitado" })
        .eq("user_id", usuario.id);

      if (error) throw error;

      toast.success(`Usuário ${usuario.name} rejeitado`);
      fetchUsuarios();
    } catch (error) {
      console.error("Erro ao rejeitar usuário:", error);
      toast.error("Erro ao rejeitar usuário");
    }
  };

  const handleOpenEdit = (usuario: Usuario) => {
    setEditingUsuario(usuario);
    setEditName(usuario.name);
    setEditEmpresa(usuario.empresa || "");
    setEditRole(usuario.user_roles[0]?.role || "CLIENT");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUsuario || !editName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          name: editName.trim(),
          empresa: editEmpresa.trim() || null,
        })
        .eq("id", editingUsuario.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (editRole !== editingUsuario.user_roles[0]?.role) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: editRole })
          .eq("user_id", editingUsuario.id);

        if (roleError) throw roleError;
      }

      toast.success("Usuário atualizado com sucesso!");
      setEditDialogOpen(false);
      fetchUsuarios();
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error("Erro ao atualizar usuário");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pendente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Aprovado":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Rejeitado":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "";
    }
  };

  const getRoleColor = (role: string) => {
    return role === "ADMIN"
      ? "bg-primary text-primary-foreground"
      : "bg-secondary text-secondary-foreground";
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie cadastros, aprovações e permissões de usuários
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-filter">Tipo</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="role-filter">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="CLIENT">Cliente</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {usuarios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum usuário encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários Cadastrados ({usuarios.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => {
                    const role = usuario.user_roles[0]?.role || "CLIENT";
                    const status = usuario.user_roles[0]?.status || "Pendente";

                    return (
                      <TableRow key={usuario.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{usuario.name}</p>
                            {usuario.username && (
                              <p className="text-xs text-muted-foreground">
                                @{usuario.username}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <div>
                            {usuario.empresa && (
                              <p className="text-sm">{usuario.empresa}</p>
                            )}
                            {usuario.cnpj && (
                              <p className="text-xs text-muted-foreground">
                                CNPJ: {usuario.cnpj}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(role)}>
                            {role === "ADMIN" ? (
                              <>
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </>
                            ) : (
                              "Cliente"
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)}>
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(usuario.created_at).toLocaleDateString(
                            "pt-BR"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {status === "Pendente" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleAprovar(usuario)}
                                  title="Aprovar"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleRejeitar(usuario)}
                                  title="Rejeitar"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(usuario)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações e permissões do usuário
            </DialogDescription>
          </DialogHeader>

          {editingUsuario && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-md text-sm">
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  {editingUsuario.email}
                </div>
                <div>
                  <span className="font-medium">Cadastro:</span>{" "}
                  {new Date(editingUsuario.created_at).toLocaleDateString(
                    "pt-BR"
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-empresa">Empresa</Label>
                <Input
                  id="edit-empresa"
                  value={editEmpresa}
                  onChange={(e) => setEditEmpresa(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Tipo de Usuário</Label>
                <Select
                  value={editRole}
                  onValueChange={(value) =>
                    setEditRole(value as "ADMIN" | "CLIENT")
                  }
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">Cliente</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Administradores têm acesso total ao sistema
                </p>
              </div>
            </div>
          )}

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
