import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import PendingApproval from "./pages/PendingApproval";
import DashboardCliente from "./pages/DashboardCliente";
import DashboardAdmin from "./pages/DashboardAdmin";
import NovaDenuncia from "./pages/NovaDenuncia";
import MinhasDenuncias from "./pages/MinhasDenuncias";
import GerenciarDenuncias from "./pages/GerenciarDenuncias";
import GerenciarProdutos from "./pages/GerenciarProdutos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            
            <Route
              path="/dashboard-cliente"
              element={
                <ProtectedRoute requireApproval>
                  <Layout>
                    <DashboardCliente />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <DashboardAdmin />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/nova-denuncia"
              element={
                <ProtectedRoute requireApproval>
                  <Layout>
                    <NovaDenuncia />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/minhas-denuncias"
              element={
                <ProtectedRoute requireApproval>
                  <Layout>
                    <MinhasDenuncias />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/denuncias"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <GerenciarDenuncias />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/produtos"
              element={
                <ProtectedRoute requireAdmin>
                  <Layout>
                    <GerenciarProdutos />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
