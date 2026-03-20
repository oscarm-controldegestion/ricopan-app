import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { generarReportePDF } from '../../utils/pdfReport';
import { generarReporteExcel } from '../../utils/excelReport';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminReportes() {
  const [locales, setLocales] = useState([]);
  const [localSel, setLocalSel] = useState('todos');
  const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [localesLoaded, setLocalesLoaded] = useState(false);

  async function cargarLocales() {
    if (localesLoaded) return;
    const snap = await getDocs(collection(db, 'locales'));
    setLocales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLocalesLoaded(true);
  }

  useEffect(() => { cargarLocales(); }, []);

  async function generarReporte() {
    setLoading(true);
    const inicio = Timestamp.fromDate(startOfDay(new Date(fecha + 'T00:00:00')));
    const fin = Timestamp.fromDate(endOfDay(new Date(fecha + 'T23:59:59')));

    try {
      let pedidos = [], facturas = [];

      if (localSel === 'todos') {
        const [snapP, snapF] = await Promise.all([
          getDocs(query(collection(db, 'pedidos'), where('creadoEn', '>=', inicio), where('creadoEn', '<=', fin))),
          getDocs(query(collection(db, 'facturas'), where('creadoEn', '>=', inicio), where('creadoEn', '<=', fin))),
        ]);
        pedidos = snapP.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.eliminado);
        facturas = snapF.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => !f.eliminado);
      } else {
        const [snapP, snapF] = await Promise.all([
          getDocs(query(collection(db, 'pedidos'), where('local', '==', localSel), where('creadoEn', '>=', inicio), where('creadoEn', '<=', fin))),
          getDocs(query(collection(db, 'facturas'), where('local', '==', localSel), where('creadoEn', '>=', inicio), where('creadoEn', '<=', fin))),
        ]);
        pedidos = snapP.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.eliminado);
        facturas = snapF.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => !f.eliminado);
      }

      setDatos({ pedidos, facturas });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  const localLabel = localSel === 'todos' ? 'Todos los locales' : localSel;

  const resumen = datos ? {
    totalPedidos: datos.pedidos.reduce((s, p) => s + (Number(p.monto) || 0), 0),
    totalFacturado: datos.facturas.reduce((s, f) => s + (Number(f.monto) || 0), 0),
    pendientePago: datos.facturas.filter(f => f.estado === 'pendiente_pago').reduce((s, f) => s + (Number(f.monto) || 0), 0),
    pendienteNC: datos.facturas.filter(f => f.estado === 'pendiente_nc').reduce((s, f) => s + (Number(f.monto) || 0), 0),
  } : null;

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 24px' }}>📊 Reportes Globales</h1>

      <div style={{ background: 'white', borderRadius: '12px', padding: '22px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '14px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Local</label>
            <select
              value={localSel}
              onChange={e => { setLocalSel(e.target.value); setDatos(null); }}
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '15px' }}
            >
              <option value="todos">Todos los locales</option>
              {locales.map(l => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => { setFecha(e.target.value); setDatos(null); }}
              style={{ width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '15px' }}
            />
          </div>
          <button
            onClick={generarReporte}
            disabled={loading}
            style={{ padding: '11px 22px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {loading ? 'Cargando...' : '🔍 Generar'}
          </button>
        </div>
      </div>

      {datos && (
        <>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#374151', margin: '0 0 14px' }}>
              {localLabel} · {format(new Date(fecha + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Pedidos', value: datos.pedidos.length, sub: `$${resumen.totalPedidos.toLocaleString('es-CL')}`, color: '#b41e1e' },
                { label: 'Facturas', value: datos.facturas.length, sub: `$${resumen.totalFacturado.toLocaleString('es-CL')}`, color: '#1d4ed8' },
                { label: 'Pend. pago', value: `$${resumen.pendientePago.toLocaleString('es-CL')}`, color: '#f59e0b' },
                { label: 'Pend. NC', value: `$${resumen.pendienteNC.toLocaleString('es-CL')}`, color: '#6366f1' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '14px', background: '#f9fafb', borderRadius: '10px', borderLeft: `3px solid ${s.color}` }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{s.label}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: '800', color: '#111827' }}>{s.value}</p>
                  {s.sub && <p style={{ margin: '2px 0 0', fontSize: '13px', color: s.color, fontWeight: '700' }}>{s.sub}</p>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 14px' }}>Exportar</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => generarReportePDF({ local: localLabel, pedidos: datos.pedidos, facturas: datos.facturas, fecha })} style={{ padding: '12px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                📄 Descargar PDF
              </button>
              <button onClick={() => generarReporteExcel({ local: localLabel, pedidos: datos.pedidos, facturas: datos.facturas, fecha })} style={{ padding: '12px 20px', background: '#15803d', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                📊 Descargar Excel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
