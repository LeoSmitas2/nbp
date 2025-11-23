import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { BarChart3, FileText, TrendingUp, AlertCircle, Search, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnuncioMonitorado {
  id: string;
  marketplace: string;
  produto: string;
  cliente: string;
  preco_minimo: number;
  preco_detectado: number;
  status: string;
  url: string;
}

export default function DashboardCliente() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [anuncios, setAnuncios] = useState<AnuncioMonitorado[]>([]);
  const [filteredAnuncios, setFilteredAnuncios] = useState<AnuncioMonitorado[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filtroMarketplace, setFiltroMarketplace] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroPrecoMin, setFiltroPrecoMin] = useState("");
  const [filtroPrecoMax, setFiltroPrecoMax] = useState("");

  useEffect(() => {
    fetchAnuncios();
  }, [profile]);

  useEffect(() => {
    aplicarFiltros();
  }, [anuncios, filtroMarketplace, filtroProduto, filtroCliente, filtroPrecoMin, filtroPrecoMax]);

  const fetchAnuncios = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("anuncios_monitorados")
        .select(`
          id,
          url,
          preco_minimo,
          preco_detectado,
          status,
          marketplaces (nome),
          produtos (nome),
          profiles (name)
        `)
        .eq("cliente_id", profile.id);

      if (error) throw error;

      const anunciosFormatados = data.map((anuncio: any) => ({
        id: anuncio.id,
        marketplace: anuncio.marketplaces?.nome || "N/A",
        produto: anuncio.produtos?.nome || "N/A",
        cliente: anuncio.profiles?.name || "N/A",
        preco_minimo: anuncio.preco_minimo,
        preco_detectado: anuncio.preco_detectado,
        status: anuncio.status,
        url: anuncio.url,
      }));

      setAnuncios(anunciosFormatados);
      setFilteredAnuncios(anunciosFormatados);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar anúncios",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...anuncios];

    if (filtroMarketplace) {
      resultado = resultado.filter((a) =>
        a.marketplace.toLowerCase().includes(filtroMarketplace.toLowerCase())
      );
    }

    if (filtroProduto) {
      resultado = resultado.filter((a) =>
        a.produto.toLowerCase().includes(filtroProduto.toLowerCase())
      );
    }

    if (filtroCliente) {
      resultado = resultado.filter((a) =>
        a.cliente.toLowerCase().includes(filtroCliente.toLowerCase())
      );
    }

    if (filtroPrecoMin) {
      const precoMin = parseFloat(filtroPrecoMin);
      if (!isNaN(precoMin)) {
        resultado = resultado.filter((a) => a.preco_minimo >= precoMin);
      }
    }

    if (filtroPrecoMax) {
      const precoMax = parseFloat(filtroPrecoMax);
      if (!isNaN(precoMax)) {
        resultado = resultado.filter((a) => a.preco_detectado <= precoMax);
      }
    }

    setFilteredAnuncios(resultado);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bem-vindo, {profile?.name}!</h1>
            <p className="text-muted-foreground">Acompanhe seus anúncios monitorados</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anúncios Monitorados</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Total em acompanhamento</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abaixo do Mínimo</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Requerem atenção</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Minhas Denúncias</CardTitle>
              <FileText className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Enviadas até agora</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Preço Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
              <p className="text-xs text-muted-foreground">Dos anúncios</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/nova-denuncia">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Nova Denúncia
                </Button>
              </Link>
              <Link to="/minhas-denuncias">
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Ver Minhas Denúncias
                </Button>
              </Link>
              <Link to="/denuncias-contra-mim">
                <Button className="w-full justify-start" variant="outline">
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  Denúncias Associadas a Mim
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Email:</strong> {profile?.email}
                </p>
                {profile?.empresa && (
                  <p className="text-sm">
                    <strong>Empresa:</strong> {profile.empresa}
                  </p>
                )}
                <p className="text-sm">
                  <strong>Status:</strong>{" "}
                  <span className="font-semibold text-green-600">Aprovado</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Anúncios Monitorados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Marketplace</label>
                  <Input
                    placeholder="Filtrar marketplace..."
                    value={filtroMarketplace}
                    onChange={(e) => setFiltroMarketplace(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Produto</label>
                  <Input
                    placeholder="Filtrar produto..."
                    value={filtroProduto}
                    onChange={(e) => setFiltroProduto(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliente</label>
                  <Input
                    placeholder="Filtrar cliente..."
                    value={filtroCliente}
                    onChange={(e) => setFiltroCliente(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preço Mín. (R$)</label>
                  <Input
                    type="number"
                    placeholder="Mínimo..."
                    value={filtroPrecoMin}
                    onChange={(e) => setFiltroPrecoMin(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preço Máx. (R$)</label>
                  <Input
                    type="number"
                    placeholder="Máximo..."
                    value={filtroPrecoMax}
                    onChange={(e) => setFiltroPrecoMax(e.target.value)}
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando anúncios...
                </div>
              ) : filteredAnuncios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum anúncio encontrado
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Marketplace</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Preço Mínimo</TableHead>
                        <TableHead>Preço Praticado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>URL</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAnuncios.map((anuncio) => (
                        <TableRow key={anuncio.id}>
                          <TableCell>{anuncio.marketplace}</TableCell>
                          <TableCell>{anuncio.produto}</TableCell>
                          <TableCell>{anuncio.cliente}</TableCell>
                          <TableCell>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(anuncio.preco_minimo)}
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(anuncio.preco_detectado)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                anuncio.status === "OK"
                                  ? "text-green-600 font-medium"
                                  : "text-destructive font-medium"
                              }
                            >
                              {anuncio.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <a
                              href={anuncio.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Ver anúncio
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}