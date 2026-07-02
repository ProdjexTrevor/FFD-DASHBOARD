import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoginScreen } from "./components/LoginScreen";
import { TenantPicker } from "./components/TenantPicker";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DateFilterProvider } from "./context/DateFilterContext";
import { TenantProvider, useTenant } from "./context/TenantContext";
import { CustomersPage } from "./pages/CustomersPage";
import { DealershipComparePage } from "./pages/DealershipComparePage";
import { FiAttachPage } from "./pages/FiAttachPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SalesTeamPage } from "./pages/SalesTeamPage";
import "./App.css";

function DashboardRoutes() {
  const { tenant } = useTenant();

  if (!tenant) {
    return <TenantPicker />;
  }

  return (
    <DateFilterProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="fi-attach" element={<FiAttachPage />} />
          <Route path="sales-team" element={<SalesTeamPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="dealerships" element={<DealershipComparePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DateFilterProvider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Checking sign in...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <TenantProvider>
      <DashboardRoutes />
    </TenantProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
