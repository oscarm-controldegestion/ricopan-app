import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function PedidoForm() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);
  const [form, setForm] = useState({
    proveedor: '',
    monto: '',
    fechaEntrega: format(new Date(), 'yyyy-MM-dd'),
    observaciones: '',
  });
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  const [mostrarNuevo, setMostrarNuevo] = useState(false);
  const [guardandoProv, setGuardandoProv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { cargarProveedores(); }, []);

  async function cargarProveedores() {
    try {
      const snap = await getDocs(query(collection(db, 'proveedores'), orderBy('nombre', 'asc')));
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.activo !== false);
      setProveedores(lista);
    } catch (e) {
      console.error(e);
    }
  }

  async function crearYSeleccionar() {
    const nombre = nuevoProveedor.trim();
    if (!nombre) return;
    setGuardandoProv(true);
    try {
      await addDoc(collection(db, 'proveedores'), { nombre, activo: true, creadoEn: Timestamp.now() });
      await cargarProveedores();
      setForm(prev => ({ ...prev, proveedor: nombre }));
      setNuevoProveedor('');
      setMostrarNuevo(false);
    } catch (e) {
      console.error(e);
    }
    setGuardandoProv(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'proveedor' && value === '__nuevo__') {
      setMostrarNuevo(true);
      return;
    }
    setMostrarNuevo(false);
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.proveedor) { setError('Selecciona un proveedor'); return; }
    if (!form.monto || isNaN(form.monto) || Number(form.monto) <= 0) { setError('Ingresa un monto válido'); return; }

    setLoading(true);
    try {
      await addDoc(collection(db, 'pedidos'), {
        local: userProfile.local,
        proveedor: form.proveedor,
        monto: Number(form.monto),
        fechaEntrega: form.fechaEntrega,
        observaciones: form.observaciones,
        creadoEn: Timestamp.now(),
        creadoPor: currentUser.uid,
        registradoPor: userProfile.nombre || currentUser.email,
      });
      navigate('/pedidos');
    } catch (e) {
      console.error(e);
      setError('Error al guardar el pedido. Intenta nuevamente.');
    }
    setLoading(false);
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px', border: '2px solid #e5e7eb',
    borderRadius: '8px', fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', background: 'white',
  };
  const labelStyle = { display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>←</button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>Registrar Pedido</h1>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: '2px 0 0' }}>{userProfile?.local}</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '14px', padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: '560px' }}>
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', color: '#dc2626', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Proveedor */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Proveedor *</label>
            <select
              name="proveedor"
              value={mostrarNuevo ? '__nuevo__' : form.proveedor}
              onChange={handleChange}
              required={!mostrarNuevo}
              style={inputStyle}
            >
              <option value="">Selecciona un proveedor...</option>
              {proveedores.map(p => (
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
              <option value="__nuevo__">➕ Agregar nuevo proveedor...</option>
            </select>

            {/* Inline: nuevo proveedor */}
            {mostrarNuevo && (
              <div style={{ marginTop: '10px', background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: '10px', padding: '14px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '700', color: '#92400e' }}>➕ Nuevo proveedor</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={nuevoProveedor}
                    onChange={e => setNuevoProveedor(e.target.value)}
                    placeholder="Nombre del proveedor"
                    autoFocus
                    style={{ ...inputStyle, flex: 1, padding: '9px 12px', fontSize: '14px' }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); crearYSeleccionar(); } }}
                  />
                  <button
                    type="button"
                    onClick={crearYSeleccionar}
                    disabled={guardandoProv || !nuevoProveedor.trim()}
                    style={{ padding: '9px 14px', background: '#b41e1e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}
                  >
                    {guardandoProv ? '...' : '✓'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMostrarNuevo(false); setNuevoProveedor(''); }}
                    style={{ padding: '9px 12px', background: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                  >
                    ✕
                  </button>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9ca3af' }}>El proveedor quedará guardado para usos futuros.</p>
              </div>
            )}

            {form.proveedor && !mostrarNuevo && (
              <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#059669', fontWeight: '600' }}>✓ {form.proveedor}</p>
            )}
          </div>

          {/* Monto */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Monto del pedido ($) *</label>
            <input type="number" name="monto" value={form.monto} onChange={handleChange} required min="1" placeholder="0" style={inputStyle} />
          </div>

          {/* Fecha entrega */}
          <div style={{ marginBottom: '18px' }}>
            <label style={labelStyle}>Fecha de entrega *</label>
            <input type="date" name="fechaEntrega" value={form.fechaEntrega} onChange={handleChange} required style={inputStyle} />
          </div>

          {/* Observaciones */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Detalles adicionales del pedido..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => navigate(-1)}
              style={{ flex: 1, padding: '13px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 2, padding: '13px', background: loading ? '#ccc' : 'linear-gradient(135deg, #b41e1e, #7a0e0e)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Guardando...' : '✓ Guardar pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
