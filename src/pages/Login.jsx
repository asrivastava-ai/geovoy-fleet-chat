import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Invalid email or password.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 360 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent-light)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>GeoVoy</div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Fleet Ops</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="you@company.com"
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
          {error && <p style={{ color: '#f85149', fontSize: 13 }}>{error}</p>}
          <button
            type="submit" disabled={loading}
            style={{ marginTop: 4, padding: '11px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', color: 'white', fontSize: 14, fontWeight: 500 }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
          Access is by invitation only. Contact your admin.
        </p>
      </div>
    </div>
  );
}
