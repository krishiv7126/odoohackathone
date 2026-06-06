import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import VendorList from "./pages/VendorList";
import RfqList from "./pages/RfqList";
import RfqNew from "./pages/RfqNew";
import RfqDetail from "./pages/RfqDetail";
import QuotationSubmit from "./pages/QuotationSubmit";
import QuotationCompare from "./pages/QuotationCompare";
import ApprovalQueue from "./pages/ApprovalQueue";
import POList from "./pages/POList";
import PODetail from "./pages/PODetail";
import InvoiceDetail from "./pages/InvoiceDetail";
import Reports from "./pages/Reports";
import ActivityLogs from "./pages/ActivityLogs";
import Unauthorized from "./pages/Unauthorized";

import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

// Instantiate TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Wrapper with RBAC Checks
interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");
  const location = useLocation();

  if (!token || !userRaw) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const user = JSON.parse(userRaw);

  if (allowedRoles && !allowedRoles.includes(user.roleName)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Determine current page header title based on location pathname
  const getPageTitle = (path: string) => {
    if (path.startsWith("/dashboard")) return "Dashboard Overview";
    if (path.startsWith("/vendors")) return "Vendor Directory";
    if (path.startsWith("/rfqs/new")) return "RFQ Worksheet Creator";
    if (path.startsWith("/rfqs")) return "Request for Quotations";
    if (path.startsWith("/quotations/compare")) return "Quotation Side-By-Side Comparison";
    if (path.startsWith("/quotations/submit")) return "Vendor Bid Portal";
    if (path.startsWith("/approvals")) return "Manager Approvals Queue";
    if (path.startsWith("/purchase-orders")) return "Purchase Orders";
    if (path.startsWith("/invoices")) return "Tax Invoices & Billing";
    if (path.startsWith("/reports")) return "Procurement Analytics";
    if (path.startsWith("/activity-logs")) return "System Audit Trail Logs";
    return "VendorBridge ERP";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Left Sidebar */}
      <Sidebar role={user.roleName} />

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Navbar */}
        <Header title={getPageTitle(location.pathname)} user={user} />

        {/* Dynamic Workspace Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Portal Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vendors"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"]}>
                <VendorList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfqs"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]}>
                <RfqList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfqs/new"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT_OFFICER"]}>
                <RfqNew />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rfqs/:id"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]}>
                <RfqDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quotations/submit/:rfqId"
            element={
              <ProtectedRoute allowedRoles={["VENDOR"]}>
                <QuotationSubmit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quotations/compare/:rfqId"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"]}>
                <QuotationCompare />
              </ProtectedRoute>
            }
          />
          <Route
            path="/approvals"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <ApprovalQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]}>
                <POList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders/:id"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]}>
                <PODetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT_OFFICER", "MANAGER", "VENDOR"]}>
                <InvoiceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"]}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <ActivityLogs />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/unauthorized"
            element={
              <ProtectedRoute>
                <Unauthorized />
              </ProtectedRoute>
            }
          />

          {/* Root Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
