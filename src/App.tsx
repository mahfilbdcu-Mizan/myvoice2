import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatBot } from "@/components/ChatBot";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DashboardVoices from "./pages/DashboardVoices";
import DashboardCredits from "./pages/DashboardCredits";
import DashboardApiKey from "./pages/DashboardApiKey";
import DashboardHistory from "./pages/DashboardHistory";
import DashboardSTT from "./pages/DashboardSTT";
import DashboardDubbing from "./pages/DashboardDubbing";
import DashboardSettings from "./pages/DashboardSettings";
import DashboardVoiceClone from "./pages/DashboardVoiceClone";
import Pricing from "./pages/Pricing";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDashboard from "./pages/admin/AdminUserDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPackages from "./pages/admin/AdminPackages";
import AdminLogin from "./pages/admin/AdminLogin";
import Contact from "./pages/Contact";
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
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/voices" element={<DashboardVoices />} />
            <Route path="/dashboard/voice-clone" element={<DashboardVoiceClone />} />
            <Route path="/dashboard/credits" element={<DashboardCredits />} />
            <Route path="/dashboard/api-key" element={<DashboardApiKey />} />
            <Route path="/dashboard/history" element={<DashboardHistory />} />
            <Route path="/dashboard/stt" element={<DashboardSTT />} />
            <Route path="/dashboard/dubbing" element={<DashboardDubbing />} />
            <Route path="/dashboard/settings" element={<DashboardSettings />} />
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/user-dashboard/:userId" element={<AdminUserDashboard />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/packages" element={<AdminPackages />} />
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatBot />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
