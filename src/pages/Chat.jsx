import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import AdminPanel from '../components/AdminPanel';
import VesselSettings from '../components/VesselSettings';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function avatarColor(str) {
  const colors = [
    { bg: 'rgba(29,111,164,0.2)', color: '#58a6ff' },
    { bg: 'rgba(26,127,75,0.2)', color: '#3fb950' },
    { bg: 'rgba(158,106,3,0.2)', color: '#d4a72c' },
    { bg: 'rgba(182,35,36,0.2)', color: '#f85149' },
    { bg: 'rgba(130,80,180,0.2)', color: '#c084fc' },
  ];
  let hash = 0;
  for (let i = 0; i < (str||'').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Chat() {
  const { user, profile } = useAuth();
  const [vessels, setVessels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState({});
  const [activeTab, setActiveTab] = useState('common');
  const [input, setInput] = useState('');
  const [routingHint, setRoutingHint] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showVesselSettings, setShowVesselSettings] = useState(false);
  const [visibleVessels, setVisibleVessels] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load vessels
  useEffect(() => {
    return onSnapshot(collection(db, 'vessels'), snap => {
      setVessels(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, []);

  // Load users map
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setUsers(map);
    });
  }, []);

  // Load messages
  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Load user's visible vessel preferences
  useEffect(() => {
    if (profile) {
      setVisibleVessels(profile.visibleVessels || []);
    }
  }, [profile]);

  // Mark messages as read when switching tabs
  useEffect(() => {
    if (!user) return;
    const tabMsgs = getTabMessages(activeTab);
    tabMsgs.forEach(m => {
      if (!m.readBy || !m.readBy[user.uid]) {
        updateDoc(doc(db, 'messages', m.id), {
          [`readBy.${user.uid}`]: serverTimestamp()
        });
      }
    });
  }, [activeTab, messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  function detectVessels(text) {
    return vessels.filter(v => text.toLowerCase().includes(v.name.toLowerCase()));
  }

  function getTabMessages(tab) {
    if (tab === 'all') return messages;
    if (tab === 'common') return messages.filter(m => !m.vesselIds || m.vesselIds.length === 0);
    return messages.filter(m => m.vesselIds && m.vesselIds.includes(tab));
  }

  function unreadCount(tab) {
    if (!user) return 0;
    return getTabMessages(tab).filter(m => !m.readBy || !m.readBy[user.uid]).length;
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !user) return;
    const matched = detectVessels(text);
    const vesselIds = matched.map(v => v.id);
    await addDoc(collection(db, 'messages'), {
      text,
      senderId: user.uid,
      senderName: profile?.name || 'Unknown',
      senderInitials: initials(profile?.name || '?'),
      timestamp: serverTimestamp(),
      vesselIds,
      readBy: { [user.uid]: serverTimestamp() }
    });
    setInput('');
    setRoutingHint([]);
    inputRef.current?.focus();
  }

  function handleInputChange(e) {
    const val = e.target.value;
    setInput(val);
    setRoutingHint(detectVessels(val));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // Build tabs: Common + visible vessel tabs + All
  const visibleVesselObjs = vessels.filter(v =>
    visibleVessels.includes(v.id) || visibleVessels.length === 0
  );

  const tabs = [
    { id: 'common', label: 'Common' },
    ...visibleVesselObjs.map(v => ({ id: v.id, label: v.name })),
    { id: 'all', label: 'All messages' }
  ];

  const tabMessages = getTabMessages(activeTab);

  function formatTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Group messages by date
  function groupByDate(msgs) {
    const groups = [];
    let currentDate = null;
    msgs.forEach(m => {
      const dateStr = m.timestamp ? formatDate(m.timestamp) : '';
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ type: 'date', label: dateStr });
      }
      groups.push({ type: 'message', data: m });
    });
    return groups;
  }

  const allUserList = Object.entries(users);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52, borderBottom: '1px solid var(--border)', background: 'var(--bg2)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent-light)', letterSpacing: '0.15em' }}>GEOVOY</div>
          <div style={{ width: 1, height: 14, background: 'var(--border2)' }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Fleet Ops</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setShowVesselSettings(true)} title="My vessels" style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '5px 10px', color: 'var(--text2)', fontSize: 12 }}>
            My vessels
          </button>
          {profile?.role === 'admin' && (
            <button onClick={() => setShowAdmin(true)} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', padding: '5px 10px', color: 'var(--text2)', fontSize: 12 }}>
              Admin
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(() => { const c = avatarColor(profile?.name); return (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: c.color }}>
                {initials(profile?.name || '')}
              </div>
            ); })()}
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{profile?.name}</span>
          </div>
          <button onClick={() => signOut(auth)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, padding: '4px 6px' }}>Sign out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', overflowX: 'auto', flexShrink: 0 }} className="tabs-bar">
        {tabs.map(t => {
          const u = unreadCount(t.id);
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '0 16px', height: 40, fontSize: 12, fontWeight: active ? 500 : 400,
              background: 'none', border: 'none', borderBottom: active ? '2px solid var(--accent-light)' : '2px solid transparent',
              color: active ? 'var(--text)' : 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0
            }}>
              {t.label}
              {u > 0 && (
                <span style={{ background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 600, borderRadius: 10, padding: '1px 5px', lineHeight: 1.4 }}>{u}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        {tabMessages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '60px 0' }}>No messages yet in this tab.</div>
        )}
        {groupByDate(tabMessages).map((item, i) => {
          if (item.type === 'date') return (
            <div key={'d' + i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', padding: '8px 0 12px', display: 'flex', alignItems: 'center', gap: 12, margin: '0 20px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              {item.label}
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
          );

          const m = item.data;
          const isMe = m.senderId === user?.uid;
          const senderColor = avatarColor(m.senderName);

          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', padding: '3px 16px', gap: 3 }}>
              {!isMe && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 36 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: senderColor.color }}>{m.senderName}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>{formatTime(m.timestamp)}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                {!isMe && (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: senderColor.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: senderColor.color, flexShrink: 0, marginBottom: 2 }}>
                    {m.senderInitials}
                  </div>
                )}
                <div style={{ maxWidth: '65%' }}>
                  {/* Vessel tags (shown in All tab) */}
                  {activeTab === 'all' && m.vesselIds?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      {m.vesselIds.map(vid => {
                        const v = vessels.find(x => x.id === vid);
                        return v ? <span key={vid} style={{ fontSize: 10, padding: '1px 6px', background: 'var(--accent-bg)', color: 'var(--accent-light)', borderRadius: 4, fontFamily: 'var(--mono)' }}>{v.name}</span> : null;
                      })}
                    </div>
                  )}
                  <div style={{
                    padding: '8px 12px', borderRadius: 12,
                    borderBottomRightRadius: isMe ? 3 : 12,
                    borderBottomLeftRadius: isMe ? 12 : 3,
                    background: isMe ? 'var(--accent)' : 'var(--bg3)',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    color: isMe ? 'white' : 'var(--text)',
                    fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word'
                  }}>
                    {m.text}
                  </div>
                  {/* Read receipts */}
                  <div style={{ display: 'flex', gap: 3, marginTop: 4, justifyContent: isMe ? 'flex-end' : 'flex-start', flexWrap: 'wrap' }}>
                    {isMe && <span style={{ fontSize: 10, color: 'var(--text3)', marginRight: 2 }}>{formatTime(m.timestamp)}</span>}
                    {allUserList.map(([uid, u]) => {
                      const read = m.readBy && m.readBy[uid];
                      const c = avatarColor(u.name);
                      return (
                        <div key={uid} title={`${u.name} ${read ? '— read' : '— unread'}`} style={{
                          width: 16, height: 16, borderRadius: '50%',
                          background: read ? c.bg : 'var(--bg3)',
                          border: `1px solid ${read ? c.color : 'var(--border2)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, fontWeight: 600,
                          color: read ? c.color : 'var(--text3)',
                          opacity: read ? 1 : 0.4
                        }}>
                          {initials(u.name)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Routing hint */}
      {routingHint.length > 0 && (
        <div style={{ padding: '5px 16px', background: 'var(--accent-bg)', borderTop: '1px solid rgba(29,111,164,0.2)', fontSize: 11, color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: 'var(--text3)' }}>Routes to:</span>
          {routingHint.map(v => <span key={v.id} style={{ fontFamily: 'var(--mono)', background: 'rgba(29,111,164,0.2)', padding: '1px 6px', borderRadius: 4 }}>{v.name}</span>)}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          rows={1}
          style={{
            flex: 1, padding: '9px 13px', background: 'var(--bg3)', border: '1px solid var(--border2)',
            borderRadius: 20, color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'none',
            lineHeight: 1.5, maxHeight: 100, overflowY: 'auto', fontFamily: 'var(--font)'
          }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
        />
        <button onClick={sendMessage} style={{
          padding: '9px 18px', background: 'var(--accent)', border: 'none', borderRadius: 20,
          color: 'white', fontSize: 13, fontWeight: 500, flexShrink: 0
        }}>Send</button>
      </div>

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showVesselSettings && <VesselSettings vessels={vessels} visibleVessels={visibleVessels} onSave={async (ids) => { setVisibleVessels(ids); await updateDoc(doc(db, 'users', user.uid), { visibleVessels: ids }); setShowVesselSettings(false); }} onClose={() => setShowVesselSettings(false)} />}
    </div>
  );
}
