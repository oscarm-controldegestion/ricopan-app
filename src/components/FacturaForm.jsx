import { useState, useRef, useEffect } from 'react';
import { collection, addDoc, Timestamp, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, compressImageToBase64 } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

const PROVEEDORES = [
  'Coca Cola', 'CCU', 'Ambev', 'Dos en Uno', 'Pan Ideal',
  'Loncoleche', 'Nestlé', 'Carozzi', 'Watts', 'Soprole', 'Otro',
];

export default function FacturaForm() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [form, setForm] = useState({
    proveedor: '',
    proveedorCustom: '',
    numeroFactura: '',
    monto: '',
    fechaRecepcion: format(new Date(), 'yyyy-MM-dd'),
    estado: 'pendiente_pago',
    observaciones: '',
  });
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Búsqueda de pedido ---
  const [pedidosDisponibles, setPedidosDisponibles] = useState([]);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  // Saldo pendiente (si monto factura < monto pedido)
  const montoPedido = pedidoSeleccionado ? Number(pedidoSeleccionado.monto) : 0;
  const montoFactura = Number(form.monto) || 0;
  const saldoPendiente = pedidoSeleccionado && montoFactura > 0
    ? Math.max(0, montoPedido - montoFactura)
    : 0;

  useEffect(() => {
    if (userProfile?.local) cargarPedidosRecientes();
  }, [userProfile]);

  // Auto-ajustar estado según saldo pendiente
  useEffect(() => {
    if (pedidoSeleccionado && montoFactura > 0) {
      if (saldoPendiente > 0) {
        setForm(prev => ({ ...prev, estado: 'pendiente_nc' }));
      } else {
        setForm(prev => ({ ...prev, estado: 'pendiente_pago' }));
      }
    }
  }, [saldoPendiente, pedidoSeleccionado]);

  async function cargarPedidosRecientes() {
    setLoadingPedidos(true);
    try {
      const hace60dias = Timestamp.fromDate(subDays(new Date(), 60));
      const local = userProfile.local;
      const q = local && local !== 'Todos'
        ? query(collection(db, 'pedidos'), where('local', '==', local), where('creadoEn', '>=', hace60dias), orderBy('creadoEn', 'desc'))
        : query(collection(db, 'pedidos'), where('creadoEn', '>=', hace60dias), orderBy('creadoEn', 'desc'));
      const snap = await getDocs(q);
      setPedidosDisponibles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
    setLoadingPedidos(false);
  }

  const pedidosFiltrados = pedidosDisponibles.filter(p =>
    busqueda.trim() === '' ||
    p.proveedor?.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.observaciones || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  function seleccionarPedido(pedido) {
    setPedidoSeleccionado(pedido);
    setForm(prev => ({ ...prev, proveedor: pedido.proveedor }));
    setMostrarBusqueda(false);
    setBusqueda('');
  }

  function limpiarPedido() {
    setPedidoSeleccionado(null);
    setForm(prev => ({ ...prev, proveedor: '', estado: 'pendiente_pago' }));
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFoto(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.proveedor) { setError('Selecciona un proveedor'); return; }
    if (!form.monto || Number(form.monto) <= 0) { setError('Ingresa un monto válido'); return; }

    setLoading(true);
    try {
      let fotoBase64 = null;
      if (foto) {
        fotoBase64 = await compressImageToBase64(foto);
      }

      const datosFactura = {
        local: userProfile.local,
        proveedor: form.proveedor === 'Otro' ? form.proveedorCustom : form.proveedor,
        numeroFactura: form.numeroFactura,
        monto: Number(form.monto),
        fechaRecepcion: form.fechaRecepcion,
        estado: saldoPendiente > 0 ? 'pendiente_nc' : form.estado,
        observaciones: form.observaciones,
        fotoBase64,
        creadoEn: Timestamp.now(),
        creadoPor: currentUser.uid,
        registradoPor: userProfile.nombre || currentUser.email,
      };

      // Datos del pedido vinculado
      if (pedidoSeleccionado) {
        datosFactura.pedidoId = pedidoSeleccionado.id;
        datosFactura.montoPedido = montoPedido;
        datosFactura.saldoPendiente = saldoPendiente;
      }

      await addDoc(collection(db, 'facturas'), datosFactura);
      navigate('/facturas');
    } catch (e) {
      console.error(e);
      setError('Error al guardar la factura. Intenta nuevamente.');
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
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>←</button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>Registrar Factura</h1>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: '2px 0 0' }}>{userProfile?.local}</p>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '14px', padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: '580px' }}>
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', color: '#dc2626', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* ===== VINCULAR PEDIDO (OPCIONAL) ===== */}
        <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '14px', fontWeight: '700', color: '#374151' }}>
              🔗 Vincular a un pedido <span style={{ fontWeight: '400', color: '#9ca3af' }}>(opcional)</span>
            </label>
            {!pedidoSeleccionado && (
              <button
                type="button"
                onClick={() => setMostrarBusqueda(!mostrarBusqueda)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: 'none',
                  background: mostrarBusqueda ? '#e5e7eb' : '#1d4ed8',
                  color: mostrarBusqueda ? '#374151' : 'white',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                {mostrarBusqueda ? 'Cancelar' : '🔍 Buscar pedido'}
              </button>
            )}
          </div>

          {/* Pedido seleccionado */}
          {pedidoSeleccionado ? (
            <div style={{
              background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '8px',
              padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: '700', color: '#065f46', fontSize: '15px' }}>
                  ✅ {pedidoSeleccionado.proveedor}
                </div>
                <div style={{ fontSize: '13px', color: '#059669', marginTop: '2px' }}>
                  Pedido del {pedidoSeleccionado.creadoEn?.toDate
                    ? format(pedidoSeleccionado.creadoEn.toDate(), "d MMM yyyy", { locale: es })
                    : '—'} · Monto: ${Number(pedidoSeleccionado.monto).toLocaleString('es-CL')}
                </div>
                {pedidoSeleccionado.fechaEntrega && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    Entrega: {format(new Date(pedidoSeleccionado.fechaEntrega + 'T00:00:00'), "d 'de' MMMM", { locale: es })}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={limpiarPedido}
                style={{
                  background: '#fee2e2', border: 'none', color: '#dc2626',
                  borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                }}
              >
                ✕ Quitar
              </button>
            </div>
          ) : mostrarBusqueda ? (
            <div>
              <input
                type="text"
                placeholder="Buscar por proveedor..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...inputStyle, marginBottom: '8px', background: 'white' }}
                autoFocus
              />
              {loadingPedidos ? (
                <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '12px' }}>Cargando pedidos...</p>
              ) : pedidosFiltrados.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '12px' }}>
                  {busqueda ? 'Sin resultados para esta búsqueda' : 'Sin pedidos recientes'}
                </p>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white' }}>
                  {pedidosFiltrados.map(p => (
                    <div
                      key={p.id}
                      onClick={() => seleccionarPedido(p)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{p.proveedor}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {p.creadoEn?.toDate ? format(p.creadoEn.toDate(), "d MMM yyyy", { locale: es }) : ''}
                          {p.fechaEntrega ? ` · Entrega: ${format(new Date(p.fechaEntrega + 'T00:00:00'), "d MMM", { locale: es })}` : ''}
                          {p.local !== userProfile?.local ? ` · ${p.local}` : ''}
                        </div>
                      </div>
                      <span style={{ fontWeight: '700', color: '#b41e1e', fontSize: '14px' }}>
                        ${Number(p.monto).toLocaleString('es-CL')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>
              Sin pedido vinculado. Puedes registrar la factura directamente.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Foto factura */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>📷 Foto de la factura</label>
            <input
              type="file"
              ref={fileRef}
              accept="image/*,application/pdf"
              capture="environment"
              onChange={handleFile}
              style={{ display: 'none' }}
            />
            {preview ? (
              <div style={{ position: 'relative' }}>
                <img src={preview} alt="Factura" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e5e7eb' }} />
                <button
                  type="button"
                  onClick={() => { setFoto(null); setPreview(null); }}
                  style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: '#dc2626', color: 'white', border: 'none',
                    borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px',
                  }}
                >✕</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  width: '100%', padding: '30px', border: '2px dashed #d1d5db',
                  borderRadius: '8px', background: '#f9fafb', cursor: 'pointer',
                  color: '#6b7280', fontSize: '14px', textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                Toca para sacar foto o subir imagen de la factura
              </button>
            )}
          </div>

          {/* Proveedor */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Proveedor *</label>
            {pedidoSeleccionado ? (
              <div style={{
                padding: '11px 14px', border: '2px solid #6ee7b7',
                borderRadius: '8px', background: '#f0fdf4', fontSize: '15px', color: '#065f46', fontWeight: '600'
              }}>
                {pedidoSeleccionado.proveedor}
              </div>
            ) : (
              <select name="proveedor" value={form.proveedor} onChange={handleChange} required style={inputStyle}>
                <option value="">Selecciona un proveedor...</option>
                {PROVEEDORES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
          </div>

          {form.proveedor === 'Otro' && !pedidoSeleccionado && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Nombre del proveedor *</label>
              <input type="text" name="proveedorCustom" value={form.proveedorCustom} onChange={handleChange} required placeholder="Nombre del proveedor" style={inputStyle} />
            </div>
          )}

          {/* Número factura y monto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>N° Factura</label>
              <input type="text" name="numeroFactura" value={form.numeroFactura} onChange={handleChange} placeholder="Ej: 123456" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Monto pagado ($) *</label>
              <input
                type="number"
                name="monto"
                value={form.monto}
                onChange={handleChange}
                required min="1"
                placeholder={pedidoSeleccionado ? String(montoPedido) : '0'}
                style={{ ...inputStyle, borderColor: saldoPendiente > 0 ? '#f59e0b' : '#e5e7eb' }}
              />
            </div>
          </div>

          {/* Alerta de saldo pendiente */}
          {saldoPendiente > 0 && (
            <div style={{
              background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '10px',
              padding: '14px 16px', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <span style={{ fontWeight: '700', color: '#92400e', fontSize: '15px' }}>
                  Pago parcial — Saldo pendiente
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#78350f', fontSize: '13px' }}>Monto del pedido:</span>
                <span style={{ color: '#78350f', fontWeight: '700' }}>${montoPedido.toLocaleString('es-CL')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#78350f', fontSize: '13px' }}>Monto pagado:</span>
                <span style={{ color: '#059669', fontWeight: '700' }}>${montoFactura.toLocaleString('es-CL')}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                borderTop: '1px solid #fcd34d', paddingTop: '6px', marginTop: '6px'
              }}>
                <span style={{ color: '#dc2626', fontSize: '14px', fontWeight: '700' }}>💸 Saldo pendiente NC:</span>
                <span style={{ color: '#dc2626', fontWeight: '800', fontSize: '16px' }}>${saldoPendiente.toLocaleString('es-CL')}</span>
              </div>
              <p style={{ color: '#92400e', fontSize: '12px', margin: '8px 0 0', fontStyle: 'italic' }}>
                La factura quedará en estado "Pendiente Nota de Crédito" hasta recibir el ajuste del proveedor.
              </p>
            </div>
          )}

          {/* Monto pedido coincide - mostrar confirmación */}
          {pedidoSeleccionado && montoFactura > 0 && saldoPendiente === 0 && montoFactura <= montoPedido && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px',
              padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ fontSize: '18px' }}>✅</span>
              <span style={{ color: '#065f46', fontSize: '13px', fontWeight: '600' }}>
                Monto cubre el pedido completo
              </span>
            </div>
          )}

          {/* Fecha recepción */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Fecha de recepción *</label>
            <input type="date" name="fechaRecepcion" value={form.fechaRecepcion} onChange={handleChange} required style={inputStyle} />
          </div>

          {/* Estado (auto-calculado si hay saldo pendiente) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Estado *</label>
            <select
              name="estado"
              value={saldoPendiente > 0 ? 'pendiente_nc' : form.estado}
              onChange={handleChange}
              required
              disabled={saldoPendiente > 0}
              style={{ ...inputStyle, opacity: saldoPendiente > 0 ? 0.7 : 1 }}
            >
              <option value="pendiente_pago">⏳ Pendiente de pago</option>
              <option value="pendiente_nc">📝 Pendiente nota de crédito</option>
              <option value="pagada">✅ Pagada</option>
            </select>
            {saldoPendiente > 0 && (
              <p style={{ fontSize: '12px', color: '#92400e', margin: '4px 0 0' }}>
                Estado fijado automáticamente por saldo pendiente
              </p>
            )}
          </div>

          {/* Observaciones */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Detalles adicionales..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => navigate(-1)} style={{ flex: 1, padding: '13px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', color: '#374151' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: '13px', background: loading ? '#ccc' : 'linear-gradient(135deg, #1d4ed8, #1e3a8a)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Guardando...' : '✓ Guardar factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
