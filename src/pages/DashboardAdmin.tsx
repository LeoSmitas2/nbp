import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Package, Store, FileText, BarChart3, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardAdmin() {
  const { profile } = useAuth();
  const [totalAnuncios, setTotalAnuncios] = useState(0);
  const [denunciasPendentes, setDenunciasPendentes] = useState(0);
  const [clientesAtivos, setClientesAtivos] = useState(0);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Buscar total de anúncios
      const { count: anunciosCount, error: anunciosError } = await supabase
        .from("anuncios_monitorados")
        .select("*", { count: "exact", head: true });

      if (anunciosError) throw anunciosError;
      setTotalAnuncios(anunciosCount || 0);

      // Buscar denúncias pendentes (status: Solicitada)
      const { count: denunciasCount, error: denunciasError } = await supabase
        .from("denuncias")
        .select("*", { count: "exact", head: true })
        .eq("status", "Solicitada");

      if (denunciasError) throw denunciasError;
      setDenunciasPendentes(denunciasCount || 0);

      // Buscar clientes ativos (aprovados com role CLIENT)
      const { count: clientesCount, error: clientesError } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "CLIENT")
        .eq("status", "Aprovado");

      if (clientesError) throw clientesError;
      setClientesAtivos(clientesCount || 0);

      // Buscar total de produtos ativos
      const { count: produtosCount, error: produtosError } = await supabase
        .from("produtos")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);

      if (produtosError) throw produtosError;
      setTotalProdutos(produtosCount || 0);
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
            <p className="text-muted-foreground">Bem-vindo, {profile?.name}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anúncios Monitorados</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : totalAnuncios}</div>
              <p className="text-xs text-muted-foreground">Total no sistema</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Denúncias Pendentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : denunciasPendentes}</div>
              <p className="text-xs text-muted-foreground">Aguardando análise</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : clientesAtivos}</div>
              <p className="text-xs text-muted-foreground">Cadastrados e aprovados</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos</CardTitle>
              <Package className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : totalProdutos}</div>
              <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Gestão de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/usuarios">
                <Button className="w-full">Gerenciar Usuários</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/produtos">
                <Button className="w-full">Gerenciar Produtos</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="mr-2 h-5 w-5" />
                Marketplaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/marketplaces">
                <Button className="w-full">Gerenciar Marketplaces</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Denúncias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/denuncias">
                <Button className="w-full">Ver Denúncias</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Anúncios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/anuncios">
                <Button className="w-full">Ver Anúncios</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Adicionar Anúncio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/adicionar-anuncio">
                <Button className="w-full" variant="outline">
                  Cadastrar Manualmente
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="mr-2 h-5 w-5" />
                Contas Marketplaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/contas-marketplaces">
                <Button className="w-full" variant="outline">
                  Gerenciar Contas
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}