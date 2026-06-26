import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { TenantPicker } from "./components/TenantPicker";
import { DateFilterProvider } from "./context/DateFilterContext";
import { TenantProvider, useTenant } from "./context/TenantContext";
import { CustomersPage } from "./pages/CustomersPage";
import { DealershipComparePage } from "./pages/DealershipComparePage";
import { FiAttachPage } from "./pages/FiAttachPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SalesTeamPage } from "./pages/SalesTeamPage";
import "./App.css";

function AppRoutes() {
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

function App() {
  return (
    <TenantProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TenantProvider>
  );
}

export default App;
