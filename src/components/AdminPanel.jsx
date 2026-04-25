import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, setDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

const TEMP_PASS = 'GeoVoy2024!';

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminPanel({ onClose }) {
  const { profile } = useAuth();
  const [tab, setTab] = useState('vessels');
  const [vessels, setVessels] = useState([]);
  const [users, setUsers] = useState([]);
  const [newVessel, setNewVessel] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'vessels'), snap => {
      setVessels(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  async function addVessel() {
    const name = newVessel.trim();
    if (!name) return;
    await addDoc(collection(db, 'vessels'), { name, createdAt: serverTimestamp(), createdBy: profile?.name || 'admin' });
    setNewVessel('');
  }

  async function removeVessel(id) {
    if (!window.confirm('Remove this vessel?')) return;
    await deleteDoc(doc(db, 'vessels', id));
  }

  async function sendInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setLoading(true);
    setMsg('');
    setInviteLink('');
    try {
      // Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, inviteEmail.trim(), TEMP_PASS);
      const uid = cred.user.uid;

      // Create user doc
      await setDoc(doc(db, 'users', uid), {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: inviteRole,
        initials: initials(inviteName.trim()),
        setupDone: false,
        visibleVessels: [],
        createdAt: serverTimestamp()
      });

      // Create invite token
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      await setDoc(doc(db, 'invites', token), {
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        tempPassword: TEMP_PASS,
        uid,
        used: false,
        createdAt: serverTimestamp()
      });

      const link = `${window.location.origin}/invite?token=${token}`;
      setInviteLink(link);
      setMsg('Invite created!');
      setInviteName('');
      setInviteEmail('');
    } catch (err) {
      setMsg('Error: ' + (err.message || 'Something went wrong'));
    }
    setLoading(false);
  }

  const btnStyle = (active) => ({
    padding: '6px 14px', fontSize: 12, fontWeight: 500,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'white' : 'var(--text2)',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border2)'),
    borderRadius: 'var(--radius)', cursor: 'pointer'
  });

  const inputStyle = {
    width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border2)',
    borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 13, outline: 'none'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', width: 480, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Admin panel</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button style={btnStyle(tab === 'vessels')} onClick={() => setTab('vessels')}>Vessels</button>
          <button style={btnStyle(tab === 'invite')} onClick={() => setTab('invite')}>Invite user</button>
          <button style={btnStyle(tab === 'team')} onClick={() => setTab('team')}>Team</button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {tab === 'vessels' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={newVessel} onChange={e => setNewVessel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addVessel()}
                  placeholder="Vessel name..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addVessel} style={{ padding: '9px 16px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', color: 'white', fontSize: 13, fontWeight: 500 }}>Add</button>
              </div>
              {vessels.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>No vessels yet.</p>}
              {vessels.sort((a,b) => a.name.localeCompare(b.name)).map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v.name}</span>
                  <button onClick={() => removeVessel(v.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}>Remove</button>
                </div>
              ))}
            </div>
          )}

          {tab === 'invite' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Full name</label>
                <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. Sarah Mitchell" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Email</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="sarah@company.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...inputStyle }}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button onClick={sendInvite} disabled={loading} style={{ padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', color: 'white', fontSize: 14, fontWeight: 500 }}>
                {loading ? 'Creating...' : 'Generate invite link'}
              </button>
              {msg && <p style={{ fontSize: 13, color: msg.startsWith('Error') ? '#f85149' : 'var(--accent-light)' }}>{msg}</p>}
              {inviteLink && (
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>Send this link to the user:</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input readOnly value={inviteLink} style={{ ...inputStyle, flex: 1, fontSize: 11, color: 'var(--accent-light)' }} onClick={e => e.target.select()} />
                    <button onClick={() => { navigator.clipboard.writeText(inviteLink); }} style={{ padding: '8px 12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 12 }}>Copy</button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Link is single-use. User sets their own password on first login.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'team' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 13 }}>No users yet.</p>}
              {users.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-bg)', border: '1px solid rgba(29,111,164,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--accent-light)', flexShrink: 0 }}>
                    {initials(u.name || u.email)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name || u.email}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>{u.email} · {u.role}</div>
                  </div>
                  {!u.setupDone && <span style={{ fontSize: 10, padding: '2px 7px', background: 'var(--amber-bg)', color: '#d4a72c', borderRadius: 4 }}>Pending</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
