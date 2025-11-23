import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Shield } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logoNash from "@/assets/logo-nash.png";

export default function PendingApproval() {
  const { profile, signOut, isApproved, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isApproved) {
      navigate("/dashboard-cliente");
    } else if (isAdmin) {
      navigate("/dashboard");
    }
  }, [isApproved, isAdmin, navigate]);

  const getStatusMessage = () => {
    if (profile?.status === "Rejeitado") {
      return {
        title: "Cadastro Rejeitado",
        description: "Infelizmente seu cadastro foi rejeitado. Entre em contato com o suporte para mais informações.",
        icon: "❌",
      };
    }
    return {
      title: "Aguardando Aprovação",
      description: "Seu cadastro está sendo analisado pela equipe Nash. Você receberá um email assim que for aprovado.",
      icon: "⏳",
    };
  };

  const status = getStatusMessage();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 items-center justify-center">
            <img src={logoNash} alt="Nash" className="h-20 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-white">Brand Protection</h1>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 text-5xl">{status.icon}</div>
            <CardTitle>{status.title}</CardTitle>
            <CardDescription>{status.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm">
                <strong>Nome:</strong> {profile?.name}
              </p>
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
                <span className="font-semibold text-primary">{profile?.status}</span>
              </p>
            </div>

            <Button onClick={signOut} variant="outline" className="w-full">
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}