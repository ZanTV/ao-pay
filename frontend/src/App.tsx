import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import CreatePaymentLinkPage from '@/pages/admin/CreatePaymentLinkPage';
import PaymentLinksPage from '@/pages/admin/PaymentLinksPage';
import TransactionsPage from '@/pages/admin/TransactionsPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import PaymentPage from '@/pages/pay/PaymentPage';
import PaymentSuccessPage from '@/pages/pay/PaymentSuccessPage';
import PaymentFailedPage from '@/pages/pay/PaymentFailedPage';
import PaymentExpiredPage from '@/pages/pay/PaymentExpiredPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/admin" replace />} />

            <Route path="/admin" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/admin/links" element={<ProtectedRoute><PaymentLinksPage /></ProtectedRoute>} />
            <Route path="/admin/links/create" element={<ProtectedRoute><CreatePaymentLinkPage /></ProtectedRoute>} />
            <Route path="/admin/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
            <Route path="/admin/customers" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            <Route path="/pay/:token" element={<PaymentPage />} />
            <Route path="/pay/:token/success" element={<PaymentSuccessPage />} />
            <Route path="/pay/:token/failed" element={<PaymentFailedPage />} />
            <Route path="/pay/:token/expired" element={<PaymentExpiredPage />} />

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
