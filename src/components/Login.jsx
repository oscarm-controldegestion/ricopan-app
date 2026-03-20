import { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(''); // email o loginId
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let authEmail = identifier.trim();

      // Si no tiene "@", es un loginId — buscamos el authEmail en Firestore
      if (!authEmail.includes('@')) {
        const q = query(collection(db, 'usuarios'), where('loginId', '==', authEmail));
        const snap = await getDocs(q);
        if (snap.empty) {
          setError('ID de usuario no encontrado. Verifica e intenta nuevamente.');
          setLoading(false);
          return;
        }
        const userData = snap.docs[0].data();
        authEmail = userData.authEmail || `${authEmail}@ricopan.interno`;
      }

      await login(authEmail, password);
    } catch (err) {
      setError('Correo/ID o contraseña incorrectos. Intenta nuevamente.');
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #b41e1e 0%, #7a0e0e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '72px', height: '72px',
            background: 'linear-gradient(135deg, #b41e1e, #7a0e0e)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            fontSize: '32px',
          }}>🥖</div>
          <h1 style={{ color: '#b41e1e', fontSize: '28px', fontWeight: '700', margin: 0 }}>RICOPAN</h1>
          <p style={{ color: '#666', fontSize: '14px', margin: '6px 0 0' }}>Sistema de gestión de compras</p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fca5a5',
            borderRadius: '8px', padding: '12px',
            color: '#dc2626', fontSize: '14px', marginBottom: '20px',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Correo electrónico o ID de usuario
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              placeholder="correo@ejemplo.com o mi.usuario"
              style={{
                width: '100%', padding: '12px', border: '2px solid #e5e7eb',
                borderRadius: '8px', fontSize: '15px', outline: 'none',
                boxSizing: 'border-box', transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#b41e1e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '12px', border: '2px solid #e5e7eb',
                borderRadius: '8px', fontSize: '15px', outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#b41e1e'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #b41e1e, #7a0e0e)',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
