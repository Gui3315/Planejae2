import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Cartoes from "./pages/Cartoes";
import ContasFixas from "./pages/ContasFixas";
import NovaContaParcelada from "./pages/NovaContaParcelada";
import Categorias from "./pages/Categorias";
import Faturas from "./pages/Faturas";
import Renda from "./pages/Renda";
import NotFound from "./pages/NotFound";
import GerenciarCategorias from "./pages/gerenciar-categorias";
import ResetPassword from "./pages/reset-password";
import LandingPage from './pages/LandingPage';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/landingpage" element={<LandingPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/gerenciar-categorias" element={<GerenciarCategorias />} />
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/cartoes" element={<Cartoes />} />
          <Route path="/contas-fixas" element={<ContasFixas />} />
          <Route path="/nova-conta-parcelada" element={<NovaContaParcelada />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/faturas" element={<Faturas />} />
          <Route path="/renda" element={<Renda />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
