import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Denuncia {
  id: string;
  url: string;
  preco_informado: number;
  observacoes: string | null;
  status: "Solicitada" | "Em andamento" | "Resolvida";
  comentario_admin: string | null;
  created_at: string;
  produtos: { nome: string; preco_minimo: number };
  marketplaces: { nome: string };
}

export default function MinhasDenuncias() {
  const { user } = useAuth();
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDenuncias();
    }
  }, [user]);

  const fetchDenuncias = async () => {
    try {
      const { data, error } = await supabase
        .from("denuncias")
        .select(`
          id,
          url,
          preco_informado,
          observacoes,
          status,
          comentario_admin,
          created_at,
          produtos (nome, preco_minimo),
          marketplaces (nome)
        `)
        .eq("cliente_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDenuncias(data || []);
    } catch (error) {
      console.error("Erro ao buscar denúncias:", error);
      toast.error("Erro ao carregar denúncias");
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold">Minhas Denúncias</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe o status das suas denúncias registradas
        </p>
      </div>

      {denuncias.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma denúncia registrada ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {denuncias.map((denuncia) => (
            <Card key={denuncia.id} className="shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">
                      {denuncia.produtos.nome}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>Marketplace: {denuncia.marketplaces.nome}</span>
                      <span>•</span>
                      <span>
                        {new Date(denuncia.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(denuncia.status)}>
                    {denuncia.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Preço Informado</p>
                    <p className="text-lg font-bold text-destructive">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(denuncia.preco_informado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Preço Mínimo</p>
                    <p className="text-lg font-bold">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(denuncia.produtos.preco_minimo)}
                    </p>
                  </div>
                </div>

                {denuncia.observacoes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Observações</p>
                    <p className="text-sm text-muted-foreground">
                      {denuncia.observacoes}
                    </p>
                  </div>
                )}

                {denuncia.comentario_admin && (
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">Comentário do Admin</p>
                    <p className="text-sm">{denuncia.comentario_admin}</p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:w-auto"
                  onClick={() => window.open(denuncia.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Anúncio
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
