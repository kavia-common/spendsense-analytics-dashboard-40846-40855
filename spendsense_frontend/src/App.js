import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import "./styles/theme.css";

import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import DashboardPage from "./pages/Dashboard";
import TransactionsPage from "./pages/Transactions";
import InsightsPage from "./pages/Insights";
import AlertsPage from "./pages/Alerts";
import SettingsPage from "./pages/Settings";
import LoginPage from "./pages/Login";

// PUBLIC_INTERFACE
function App() {
  /** SpendSense frontend app entry (routing + layout scaffold). */
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected app area */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Basic fallback */}
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
