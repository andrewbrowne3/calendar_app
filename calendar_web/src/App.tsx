import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store/store';
import { checkAuthStatus } from './store/slices/authSlice';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import CalendarPage from './pages/CalendarPage';
import GoalsPage from './pages/GoalsPage';
import ChatbotPage from './pages/ChatbotPage';
import ProfilePage from './pages/ProfilePage';
import FinanceDashboardPage from './pages/FinanceDashboardPage';
import FinanceAccountsPage from './pages/FinanceAccountsPage';
import FinanceTransactionsPage from './pages/FinanceTransactionsPage';
import FinanceBudgetsPage from './pages/FinanceBudgetsPage';
import FinanceReportsPage from './pages/FinanceReportsPage';
import FinanceSubscriptionsPage from './pages/FinanceSubscriptionsPage';
import './App.css';

function AppContent() {
  useEffect(() => {
    store.dispatch(checkAuthStatus());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/calendar" replace />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="finances" element={<FinanceDashboardPage />} />
          <Route path="finances/accounts" element={<FinanceAccountsPage />} />
          <Route path="finances/transactions" element={<FinanceTransactionsPage />} />
          <Route path="finances/budgets" element={<FinanceBudgetsPage />} />
          <Route path="finances/subscriptions" element={<FinanceSubscriptionsPage />} />
          <Route path="finances/reports" element={<FinanceReportsPage />} />
          <Route path="chat" element={<ChatbotPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/calendar" replace />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </BrowserRouter>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
