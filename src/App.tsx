import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CharacterProvider } from "@/contexts/CharacterContext";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary, SafeComponent } from "@/components/ErrorBoundary";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Pricing from "./pages/Pricing";
import { InstallPrompt } from "./components/InstallPrompt";
import DashboardLayout from "./layouts/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import Chat from "./pages/Chat";
import Prompts from "./pages/Prompts";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/SettingsPage";
import CharactersPage from "./pages/CharactersPage";
import DarkPipelinePage from "./pages/DarkPipelinePage";
import NotFound from "./pages/NotFound";
import { Navigate } from "react-router-dom";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" storageKey="savvyowl-theme" disableTransitionOnChange={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter>
          <AuthProvider>
          <CharacterProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard/chat" replace />} />
                <Route path="home" element={<SafeComponent><DashboardHome /></SafeComponent>} />
                <Route path="chat" element={<SafeComponent><Chat /></SafeComponent>} />
                <Route path="prompts" element={<SafeComponent><Prompts /></SafeComponent>} />
                <Route path="analytics" element={<SafeComponent><Analytics /></SafeComponent>} />
                <Route path="characters" element={<SafeComponent><CharactersPage /></SafeComponent>} />
                <Route path="dark-pipeline" element={<SafeComponent><DarkPipelinePage /></SafeComponent>} />
                <Route path="settings" element={<SafeComponent><SettingsPage /></SafeComponent>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CharacterProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
