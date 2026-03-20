import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NAV_ATENDEDORA = [
  { path: '/dashboard', label: 'Inicio', icon: '🏠' },
  { path: '/pedidos/nuevo', label: 'Nuevo Pedido', icon: '📦' },
  { path: '/pedidos', label: 'Pedidos', icon: '📋' },
  { path: '/facturas', label: 'Facturas', icon: '🧾' },
  { path: '/reportes', label: 'Reportes', icon: '📊' },
];

const NAV_ADMIN = [
  { path: '/admin', label: 'Inicio', icon: '🏠' },
  { path: '/admin/locales', label: 'Locales', icon: '🏪' },
  { path: '/admin/usuarios', label: 'Usuarios', icon: '👥' },
  { path: '/admin/proveedores', label: 'Proveedores', icon: '🏭' },
  { path: '/admin/reportes', label: 'Reportes', icon: '📊' },
];

export default function Layout({ children }) {
  const { userProfile, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = isAdmin ? NAV_ADMIN : NAV_ATENDEDORA;

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #b41e1e 0%, #7a0e0e 100%)',
        color: 'white', padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '56px', position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/ricopan-app/logo.png"
            alt="Ricopan"
            style={{ height: '38px', width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
          />
          {userProfile?.local && (
            <div style={{ fontSize: '11px', opacity: 0.85, color: 'white' }}>{userProfile.local}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', opacity: 0.9, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userProfile?.nombre || userProfile?.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white',
              padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '600',
            }}
          >
            Salir
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        {/* Sidebar desktop */}
        <nav className="sidebar-desktop" style={{
          width: '210px', background: 'white', borderRight: '1px solid #e5e7eb',
          flexShrink: 0, paddingTop: '12px',
        }}>
          {navItems.map(item => {
            const active = location.pathname === item.path || (item.path !== '/dashboard' && item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 18px', textDecoration: 'none',
                  color: active ? '#b41e1e' : '#374151',
                  background: active ? '#fff1f1' : 'transparent',
                  fontWeight: active ? '700' : '500',
                  fontSize: '14px',
                  borderLeft: `3px solid ${active ? '#b41e1e' : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <main style={{ flex: 1, padding: '20px', paddingBottom: '80px', minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '2px solid #e5e7eb',
        display: 'flex', zIndex: 200,
      }}>
        {navItems.map(item => {
          const active = location.pathname === item.path || (item.path !== '/dashboard' && item.path !== '/admin' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', textDecoration: 'none', flex: 1,
                padding: '6px 2px',
                color: active ? '#b41e1e' : '#9ca3af',
              }}
            >
              <span style={{ fontSize: '22px' }}>{item.icon}</span>
              <span style={{ fontSize: '9px', marginTop: '2px', fontWeight: active ? '700' : '400' }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
