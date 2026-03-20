import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ProveedoresManager() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState(null); // { id, nombre }
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => { cargarProveedores(); }, []);

  async function cargarProveedores() {
    setLoading(true);
    const snap = await getDocs(query(collection(db, 'proveedores'), orderBy('nombre', 'asc')));
    setProveedores(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function agregarProveedor(e) {
    e.preventDefault();
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    setError('');
    const existe = proveedores.some(p => p.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) { setError('Ya existe un proveedor con ese nombre.'); return; }
    setSaving(true);
    await addDoc(collection(db, 'proveedores'), { nombre, activo: true, creadoEn: Timestamp.now() });
    setNuevoNombre('');
    setShowForm(false);
    setOk(`✅ Proveedor "${nombre}" agregado.`);
    setTimeout(() => setOk(''), 3000);
    cargarProveedores();
    setSaving(false);
  }

  async function guardarEdicion(id) {
    const nombre = editando.nombre.trim();
    if (!nombre) return;
    await updateDoc(doc(db, 'proveedores', id), { nombre });
    setEditando(null);
    cargarProveedores();
  }

  async function toggleActivo(p) {
    await updateDoc(doc(db, 'proveedores', p.id), { activo: !p.activo });
    cargarProveedores();
  }

  const activos = proveedores.filter(p => p.activo !== false);
  const inactivos = proveedores.filter(p => p.activo === false);

  const inputStyle = { width: '100%', padding: '10px 14px', border: '2px solid #e5e7eb', borderRadius: '8px', fontSize: '15px', boxSizing: 'border-box' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>🏭 Proveedores</h1>
        <button
          onClick={() => { setShowForm(true); setError(''); setNuevoNombre(''); }}
          style={{ background: '#b41e1e', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
        >
          ➕ Nuevo proveedor
        </button>
      </div>

      {ok && <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px 18px', borderRadius: '10px', marginBottom: '16px', fontWeight: '600' }}>{ok}</div>}

      {showForm && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', marginBottom: '20px', border: '2px solid #b41e1e' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 14px' }}>Nuevo proveedor</h2>
          {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
          <form onSubmit={agregarProveedor} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              placeholder="Nombre del proveedor"
              required
              autoFocus
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding: '10px 16px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 18px', background: '#b41e1e', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
              {saving ? 'Guardando...' : '✓ Guardar'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Cargando...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '8px', marginBottom: inactivos.length ? '24px' : 0 }}>
            {activos.length === 0 && (
              <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                Sin proveedores activos. Agrega el primero.
              </div>
            )}
            {activos.map(p => (
              <div key={p.id} style={{ background: 'white', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '3px solid #b41e1e' }}>
                {editando?.id === p.id ? (
                  <>
                    <input
                      type="text"
                      value={editando.nombre}
                      onChange={e => setEditando(prev => ({ ...prev, nombre: e.target.value }))}
                      autoFocus
                      style={{ ...inputStyle, flex: 1, padding: '7px 10px', fontSize: '14px' }}
                      onKeyDown={e => { if (e.key === 'Enter') guardarEdicion(p.id); if (e.key === 'Escape') setEditando(null); }}
                    />
                    <button onClick={() => guardarEdicion(p.id)}
                      style={{ padding: '7px 14px', background: '#b41e1e', color: 'white', border: 'none', borderRadius: '7px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                      ✓ Guardar
                    </button>
                    <button onClick={() => setEditando(null)}
                      style={{ padding: '7px 10px', background: '#f3f4f6', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px' }}>
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontWeight: '600', fontSize: '15px', color: '#111827' }}>🏭 {p.nombre}</span>
                    <button onClick={() => setEditando({ id: p.id, nombre: p.nombre })}
                      style={{ padding: '6px 12px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => toggleActivo(p)}
                      style={{ padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      🗑️ Desactivar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {inactivos.length > 0 && (
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>Desactivados ({inactivos.length})</p>
              <div style={{ display: 'grid', gap: '8px' }}>
                {inactivos.map(p => (
                  <div key={p.id} style={{ background: 'white', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.6, borderLeft: '3px solid #d1d5db' }}>
                    <span style={{ flex: 1, fontSize: '14px', color: '#6b7280', textDecoration: 'line-through' }}>{p.nombre}</span>
                    <button onClick={() => toggleActivo(p)}
                      style={{ padding: '6px 12px', background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      ↩ Reactivar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
