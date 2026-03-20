import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import PedidoForm from './components/PedidoForm';
import PedidosList from './components/PedidosList';
import FacturaForm from './components/FacturaForm';
import FacturasList from './components/FacturasList';
import Reportes from './components/Reportes';
import AdminDashboard from './components/admin/AdminDashboard';
import LocalesManager from './components/admin/LocalesManager';
import UsuariosManager from './components/admin/UsuariosManager';
import AdminReportes from './components/admin/AdminReportes';
import ProveedoresManager from './components/admin/ProveedoresManager';

function ProtectedRoute({ children, adminOnly = false }) {
  const { currentUser, isAdmin } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { currentUser, isAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        currentUser
          ? <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
          : <Login />
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/pedidos/nuevo" element={
        <ProtectedRoute>
          <Layout><PedidoForm /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/pedidos" element={
        <ProtectedRoute>
          <Layout><PedidosList /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/facturas/nueva" element={
        <ProtectedRoute>
          <Layout><FacturaForm /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/facturas" element={
        <ProtectedRoute>
          <Layout><FacturasList /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/reportes" element={
        <ProtectedRoute>
          <Layout><Reportes /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <Layout><AdminDashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/locales" element={
        <ProtectedRoute adminOnly>
          <Layout><LocalesManager /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/usuarios" element={
        <ProtectedRoute adminOnly>
          <Layout><UsuariosManager /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/proveedores" element={
        <ProtectedRoute adminOnly>
          <Layout><ProveedoresManager /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/reportes" element={
        <ProtectedRoute adminOnly>
          <Layout><AdminReportes /></Layout>
        </ProtectedRoute>
      } />

      <Route path="*" element={
        <Navigate to={currentUser ? (isAdmin ? '/admin' : '/dashboard') : '/login'} replace />
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}
