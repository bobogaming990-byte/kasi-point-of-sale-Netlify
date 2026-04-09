import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Sales from "@/pages/Sales";
import UsersPage from "@/pages/UsersPage";
import Subscription from "@/pages/Subscription";
import BrandingSettings from "@/pages/BrandingSettings";
import Returns from "@/pages/Returns";
import Accounting from "@/pages/Accounting";
import Setup from "@/pages/Setup";
import NotFound from "@/pages/NotFound";
import { store } from "@/lib/store";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    // No production users yet → send everyone to first-run setup
    if (!store.hasProductionUsers()) {
      return (
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      );
    }
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/settings/branding" element={<BrandingSettings />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/accounting" element={<Accounting />} />
        <Route path="/setup" element={<Setup />} />
      </Route>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
