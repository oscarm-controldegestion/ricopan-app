import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, compressImageToBase64 } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADOS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente_pago', label: '⏳ Pend. pago' },
  { value: 'pendiente_nc', label: '📝 Pend. NC' },
  { value: 'pagada', label: '✅ Pagada' },
  { value: 'completada', label: '🏁 Completada' },
];

const BADGE = {
  pendiente_pago: { label: 'Pendiente de pago', color: '#92400e', bg: '#fef3c7', border: '#f59e0b' },
  pendiente_nc: { label: 'Pendiente NC', color: '#1e40af', bg: '#dbeafe', border: '#3b82f6' },
  pagada: { label: 'Pagada', color: '#065f46', bg: '#d1fae5', border: '#10b981' },
  completada: { label: 'Completada', color: '#374151', bg: '#f3f4f6', border: '#9ca3af' },
};

function FacturaCard({ factura, onUpdate }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showNCForm, setShowNCForm] = useState(false);
  const [ncForm, setNcForm] = useState({
    numero: '',
    fecha: format(new Date(), 'yyyy-MM-dd'),
    monto: factura.saldoPendiente > 0 ? String(factura.saldoPendiente) : '',
  });
  const [savingNC, setSavingNC] = useState(false);
  const { userProfile } = useAuth();

  const badge = BADGE[factura.estado] || { label: factura.estado, color: '#374151', bg: '#f3f4f6', border: '#9ca3af' };
  const saldo = Number(factura.saldoPendiente) || 0;

  async function handleComprobante(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const comprobanteBase64 = await compressImageToBase64(file);
      await updateDoc(doc(db, 'facturas', factura.id), {
        comprobanteBase64,
        estado: 'pagada',
        fechaPago: Timestamp.now(),
      });
      onUpdate();
    } catch (e) {
      console.error(e);
    }
    setUploading(false);
  }

  async function cambiarEstado(nuevoEstado) {
    await updateDoc(doc(db, 'facturas', factura.id), { estado: nuevoEstado });
    onUpdate();
  }

  async function registrarNC(e) {
    e.preventDefault();
    if (!ncForm.numero || !ncForm.fecha || !ncForm.monto) return;
    setSavingNC(true);
    try {
      await updateDoc(doc(db, 'facturas', factura.id), {
        notaCredito: {
          numero: ncForm.numero,
          fecha: ncForm.fecha,
          monto: Number(ncForm.monto),
          registradoEn: Timestamp.now(),
          registradoPor: userProfile?.nombre || '',
        },
        estado: 'completada',
        saldoPendiente: 0,
      });
      setShowNCForm(false);
      onUpdate();
    } catch (e) {
      console.error(e);
    }
    setSavingNC(false);
  }

  return (
    <div style={{
      background: 'white', borderRadius: '12px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      borderLeft: `4px solid ${badge.border}`,
      overflow: 'hidden',
    }}>
      <div
        style={{ padding: '16px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>{factura.proveedor}</span>
            <span style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
              background: badge.bg, color: badge.color,
            }}>{badge.label}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            {factura.numeroFactura && `Fact. N°: ${factura.numeroFactura} · `}
            Recibida: {factura.fechaRecepcion ? format(new Date(factura.fechaRecepcion + 'T00:00:00'), "dd MMM yyyy", { locale: es }) : '-'}
          </div>
          {/* Saldo pendiente badge visible en la cabecera */}
          {saldo > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              marginTop: '6px', background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: '8px', padding: '4px 10px',
            }}>
              <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '700' }}>
                ⚠️ Saldo pendiente NC: ${saldo.toLocaleString('es-CL')}
              </span>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', marginLeft: '12px' }}>
          <div style={{ fontWeight: '800', fontSize: '18px', color: '#111827' }}>${Number(factura.monto).toLocaleString('es-CL')}</div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{expanded ? '▲' : '▼'}</div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid #f3f4f6' }}>
          {factura.observaciones && (
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '12px 0 10px', fontStyle: 'italic' }}>
              💬 {factura.observaciones}
            </p>
          )}

          {/* Detalle saldo/pedido vinculado */}
          {factura.pedidoId && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', fontWeight: '600' }}>
                🔗 Pedido vinculado — Monto: ${Number(factura.montoPedido || 0).toLocaleString('es-CL')}
              </p>
              {saldo > 0 && (
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#92400e', fontWeight: '700' }}>
                  ⚠️ Saldo pendiente de NC: ${saldo.toLocaleString('es-CL')}
                  &nbsp;(Factura: ${Number(factura.monto).toLocaleString('es-CL')} / Pedido: ${Number(factura.montoPedido || 0).toLocaleString('es-CL')})
                </p>
              )}
            </div>
          )}

          {/* Nota de crédito ya registrada */}
          {factura.notaCredito && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#065f46' }}>📝 Nota de Crédito registrada</p>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#374151' }}>
                N° {factura.notaCredito.numero} · {factura.notaCredito.fecha
                  ? format(new Date(factura.notaCredito.fecha + 'T00:00:00'), "dd MMM yyyy", { locale: es })
                  : '-'} · ${Number(factura.notaCredito.monto).toLocaleString('es-CL')}
              </p>
              {factura.notaCredito.registradoPor && (
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>
                  Por: {factura.notaCredito.registradoPor}
                </p>
              )}
            </div>
          )}

          {/* Foto factura */}
          {factura.fotoBase64 && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 6px' }}>📷 Factura:</p>
              <img src={factura.fotoBase64} alt="Factura" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => window.open(factura.fotoBase64)} />
            </div>
          )}

          {/* Comprobante pago */}
          {factura.comprobanteBase64 ? (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#374151', margin: '0 0 6px' }}>✅ Comprobante de pago:</p>
              <img src={factura.comprobanteBase64} alt="Comprobante" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => window.open(factura.comprobanteBase64)} />
            </div>
          ) : (factura.estado === 'pendiente_pago') && (
            <div style={{ marginBottom: '12px' }}>
              <input
                type="file"
                ref={fileRef}
                accept="image/*,application/pdf"
                onChange={handleComprobante}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: '10px 18px', background: uploading ? '#ccc' : '#1d4ed8',
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: '600',
                }}
              >
                {uploading ? 'Subiendo...' : '📎 Subir comprobante de pago'}
              </button>
            </div>
          )}

          {/* Botón registrar NC */}
          {factura.estado === 'pendiente_nc' && !factura.notaCredito && !showNCForm && (
            <div style={{ marginBottom: '12px' }}>
              <button
                onClick={() => setShowNCForm(true)}
                style={{
                  padding: '10px 18px', background: '#1e40af',
                  color: 'white', border: 'none', borderRadius: '8px',
                  cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                }}
              >
                📝 Registrar Nota de Crédito
              </button>
            </div>
          )}

          {/* Formulario NC inline */}
          {showNCForm && (
            <div style={{ background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 12px', fontWeight: '700', color: '#1e40af', fontSize: '14px' }}>📝 Registrar Nota de Crédito</p>
              <form onSubmit={registrarNC}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>N° Nota de Crédito *</label>
                    <input
                      type="text"
                      value={ncForm.numero}
                      onChange={e => setNcForm(p => ({ ...p, numero: e.target.value }))}
                      placeholder="Ej: NC-001"
                      required
                      style={{ width: '100%', padding: '8px 10px', border: '2px solid #e5e7eb', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Fecha NC *</label>
                    <input
                      type="date"
                      value={ncForm.fecha}
                      onChange={e => setNcForm(p => ({ ...p, fecha: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '8px 10px', border: '2px solid #e5e7eb', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>
                    Monto NC * {saldo > 0 && <span style={{ color: '#92400e' }}>(saldo pendiente: ${saldo.toLocaleString('es-CL')})</span>}
                  </label>
                  <input
                    type="number"
                    value={ncForm.monto}
                    onChange={e => setNcForm(p => ({ ...p, monto: e.target.value }))}
                    placeholder="0"
                    required
                    min="1"
                    style={{ width: '100%', padding: '8px 10px', border: '2px solid #e5e7eb', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowNCForm(false)}
                    style={{ flex: 1, padding: '9px', background: '#f3f4f6', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingNC}
                    style={{ flex: 2, padding: '9px', background: savingNC ? '#ccc' : '#1e40af', color: 'white', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: '700', cursor: savingNC ? 'not-allowed' : 'pointer' }}
                  >
                    {savingNC ? 'Guardando...' : '✓ Guardar NC'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Cambiar estado */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {['pendiente_pago', 'pendiente_nc', 'pagada', 'completada'].filter(e => e !== factura.estado).map(e => (
              <button
                key={e}
                onClick={() => cambiarEstado(e)}
                style={{
                  padding: '6px 12px', border: '1px solid #e5e7eb', background: '#f9fafb',
                  borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#374151',
                }}
              >
                → {BADGE[e]?.label || e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FacturasList() {
  const { userProfile } = useAuth();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');

  useEffect(() => {
    if (userProfile?.local) cargarFacturas();
  }, [userProfile]);

  async function cargarFacturas() {
    setLoading(true);
    try {
      // Solo orderBy para evitar índice compuesto; filtro de local en cliente
      const q = query(
        collection(db, 'facturas'),
        orderBy('creadoEn', 'desc')
      );
      const snap = await getDocs(q);
      const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const localFiltro = userProfile.local;
      const filtradas = localFiltro === 'Todos'
        ? todas
        : todas.filter(f => f.local === localFiltro);
      setFacturas(filtradas);
    } catch (e) {
      console.error('Error cargando facturas:', e);
    }
    setLoading(false);
  }

  const filtradas = filtroEstado === 'todos' ? facturas : facturas.filter(f => f.estado === filtroEstado);
  const totalMonto = filtradas.reduce((s, f) => s + (Number(f.monto) || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>🧾 Facturas</h1>
        <Link to="/facturas/nueva" style={{
          background: '#1d4ed8', color: 'white', padding: '10px 18px',
          borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '14px',
        }}>
          ➕ Nueva factura
        </Link>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {ESTADOS.map(e => (
          <button
            key={e.value}
            onClick={() => setFiltroEstado(e.value)}
            style={{
              padding: '8px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              background: filtroEstado === e.value ? '#b41e1e' : '#f3f4f6',
              color: filtroEstado === e.value ? 'white' : '#374151',
            }}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Totales */}
      <div style={{ background: 'white', borderRadius: '10px', padding: '12px 18px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#6b7280', fontSize: '14px' }}>{filtradas.length} factura(s)</span>
        <span style={{ fontWeight: '700', color: '#b41e1e' }}>Total: ${totalMonto.toLocaleString('es-CL')}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: '40px', margin: '0 0 12px' }}>🧾</p>
          <p style={{ color: '#6b7280' }}>Sin facturas{filtroEstado !== 'todos' ? ' con este estado' : ''}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtradas.map(f => (
            <FacturaCard key={f.id} factura={f} onUpdate={cargarFacturas} />
          ))}
        </div>
      )}
    </div>
  );
}
