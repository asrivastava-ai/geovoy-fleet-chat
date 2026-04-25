import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');

  const [invite, setInvite] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid invite link.'); setLoading(false); return; }
    getDoc(doc(db, 'invites', token)).then(snap => {
      if (!snap.exists() || snap.data().used) {
        setError('This invite link is invalid or has already been used.');
      } else {
        setInvite(snap.data());
        setName(snap.data().name || '');
      }
      setLoading(false);
    });
  }, [token]);

  async function handleAccept(e) {
    e.preventDefault();
    if (password !== password2) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSubmitting(true);
    setError('');
    try {
      // Sign in with temp password set by admin
      const cred = await signInWithEmailAndPassword(auth, invite.email, invite.tempPassword);
      // Update password
      await updatePassword(cred.user, password);
      // Update user profile
      await updateDoc(doc(db, 'users', cred.user.uid), { name, setupDone: true });
      // Mark invite used
      await updateDoc(doc(db, 'invites', token), { used: true });
      navigate('/');
    } catch (err) {
      setError('Something went wrong. Please contact your admin.');
    }
    setSubmitting(false);
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>Checking invite...</div>;
  if (error && !invite) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#f85149', marginBottom: 12 }}>{error}</p>
        <a href="/" style={{ color: 'var(--accent-light)', fontSize: 13 }}>Go to login</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 360 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent-light)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>GeoVoy Fleet Ops</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>You've been invited</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>Set up your account to join the team.</p>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--accent-bg)', border: '1px solid rgba(29,111,164,0.3)', borderRadius: 'var(--radius)', marginBottom: 20, fontSize: 13 }}>
          Joining as <strong>{invite.email}</strong>
        </div>

        <form onSubmit={handleAccept} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Your name</label>
            <input
              value={name} onChange={e => setName(e.target.value)} required
              placeholder="e.g. Sarah M."
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Choose a password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Min. 8 characters"
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Confirm password</label>
            <input
              type="password" value={password2} onChange={e => setPassword2(e.target.value)} required
              placeholder="Repeat password"
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
          {error && <p style={{ color: '#f85149', fontSize: 13 }}>{error}</p>}
          <button
            type="submit" disabled={submitting}
            style={{ marginTop: 4, padding: '11px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', color: 'white', fontSize: 14, fontWeight: 500 }}
          >
            {submitting ? 'Setting up...' : 'Activate account'}
          </button>
        </form>
      </div>
    </div>
  );
}
