import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PedidosList() {
  const { userProfile } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fechaFiltro, setFechaFiltro] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (userProfile?.local) cargarPedidos();
  }, [userProfile, fechaFiltro]);

  async function cargarPedidos() {
    setLoading(true);
    const inicio = startOfDay(new Date(fechaFiltro + 'T00:00:00'));
    const fin = endOfDay(new Date(fechaFiltro + 'T23:59:59'));

    try {
      // Usamos solo orderBy para evitar índices compuestos en Firestore.
      // El filtro por local y fecha se aplica en el cliente.
      const q = query(
        collection(db, 'pedidos'),
        orderBy('creadoEn', 'desc')
      );
      const snap = await getDocs(q);
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Filtrar por local del usuario (admin con 'Todos' ve todos los locales)
      const localFiltro = userProfile.local;
      const filtrados = todos.filter(p => {
        const matchLocal = localFiltro === 'Todos' || p.local === localFiltro;
        const fecha = p.creadoEn?.toDate ? p.creadoEn.toDate() : null;
        const matchFecha = fecha && fecha >= inicio && fecha <= fin;
        return matchLocal && matchFecha;
      });

      setPedidos(filtrados);
    } catch (e) {
      console.error('Error cargando pedidos:', e);
    }
    setLoading(false);
  }

  const totalHoy = pedidos.reduce((s, p) => s + (Number(p.monto) || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>📦 Pedidos</h1>
        <Link to="/pedidos/nuevo" style={{
          background: '#b41e1e', color: 'white', padding: '10px 18px',
          borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '14px',
        }}>
          ➕ Nuevo pedido
        </Link>
      </div>

      {/* Filtro fecha */}
      <div style={{ background: 'white', borderRadius: '10px', padding: '14px 18px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Fecha:</label>
        <input
          type="date"
          value={fechaFiltro}
          onChange={e => setFechaFiltro(e.target.value)}
          style={{ padding: '8px 12px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
        />
        <span style={{ marginLeft: 'auto', fontWeight: '700', color: '#b41e1e', fontSize: '16px' }}>
          Total: ${totalHoy.toLocaleString('es-CL')}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Cargando...</div>
      ) : pedidos.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: '40px', margin: '0 0 12px' }}>📦</p>
          <p style={{ color: '#6b7280', fontSize: '15px' }}>Sin pedidos para esta fecha</p>
          <Link to="/pedidos/nuevo" style={{ color: '#b41e1e', textDecoration: 'none', fontWeight: '700' }}>
            Registrar primer pedido →
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pedidos.map(p => (
            <div key={p.id} style={{
              background: 'white', borderRadius: '12px', padding: '16px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
              borderLeft: '4px solid #b41e1e',
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '16px', color: '#111827' }}>{p.proveedor}</p>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  📅 Entrega: {p.fechaEntrega ? format(new Date(p.fechaEntrega + 'T00:00:00'), "dd 'de' MMMM", { locale: es }) : 'Por confirmar'}
                </p>
                {p.observaciones && (
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>{p.observaciones}</p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: '800', fontSize: '18px', color: '#b41e1e' }}>
                  ${Number(p.monto).toLocaleString('es-CL')}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>
                  {p.creadoEn?.toDate ? format(p.creadoEn.toDate(), 'HH:mm') : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
