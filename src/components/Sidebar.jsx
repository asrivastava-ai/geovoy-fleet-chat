import { useState, useRef, useEffect } from 'react';

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
  for (let i = 0; i < (str || '').length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Sidebar({ vessels, activeTab, onTabChange, getUnreadCount, isMobile, isOpen, onClose }) {
  const [search, setSearch] = useState('');
  const [width, setWidth] = useState(220);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  // Resize drag handlers (desktop only)
  function onMouseDown(e) {
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
  function onMouseMove(e) {
    if (!dragging.current) return;
    const newW = Math.max(160, Math.min(360, startW.current + (e.clientX - startX.current)));
    setWidth(newW);
  }
  function onMouseUp() {
    dragging.current = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  // Filter vessels by search
  const filtered = vessels.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));

  // Sort: unread first (by count desc), then alpha
  const sorted = [...filtered].sort((a, b) => {
    const ua = getUnreadCount(a.id);
    const ub = getUnreadCount(b.id);
    if (ua > 0 && ub === 0) return -1;
    if (ub > 0 && ua === 0) return 1;
    if (ua !== ub) return ub - ua;
    return a.name.localeCompare(b.name);
  });

  const mentionsCount = getUnreadCount('mentions');
  const commonCount = getUnreadCount('common');
  const allCount = getUnreadCount('all');

  const sidebarStyle = isMobile ? {
    position: 'fixed', inset: 0, zIndex: 100,
    display: isOpen ? 'flex' : 'none',
    flexDirection: 'row',
  } : {
    display: 'flex',
    flexDirection: 'row',
    flexShrink: 0,
  };

  function NavItem({ id, label, icon, count }) {
    const active = activeTab === id;
    return (
      <button onClick={() => { onTabChange(id); if (isMobile) onClose(); }} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px', margin: '1px 6px', borderRadius: 6,
        background: active ? 'rgba(29,111,164,0.2)' : 'none',
        border: 'none', cursor: 'pointer', textAlign: 'left', width: 'calc(100% - 12px)',
        color: active ? '#58a6ff' : 'var(--text2)',
      }}>
        <span style={{ fontSize: 13, fontWeight: active ? 500 : 400, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>{label}
        </span>
        {count > 0 && <span style={{ background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 600, borderRadius: 10, padding: '1px 6px' }}>{count}</span>}
      </button>
    );
  }

  return (
    <div style={sidebarStyle}>
      {/* Backdrop on mobile */}
      {isMobile && isOpen && (
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: -1 }} />
      )}

      {/* Sidebar panel */}
      <div style={{
        width: isMobile ? 260 : width, flexShrink: 0,
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', height: '100%',
        position: isMobile ? 'relative' : 'relative', zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent-light)', letterSpacing: '0.15em' }}>GEOVOY</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 1 }}>Fleet Ops</div>
          </div>
          {isMobile && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18, cursor: 'pointer' }}>✕</button>
          )}
        </div>

        {/* Fixed nav items */}
        <div style={{ padding: '8px 0 4px' }}>
          <NavItem id="common" label="Common" icon="💬" count={commonCount} />
          <NavItem id="mentions" label="Mentions" icon="@" count={mentionsCount} />
          <NavItem id="all" label="All messages" icon="📋" count={0} />
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 12px' }} />

        {/* Search */}
        <div style={{ padding: '8px 10px 4px' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search vessels..."
            style={{ width: '100%', padding: '6px 10px', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--text)', fontSize: 12, outline: 'none' }}
          />
        </div>

        {/* Vessel list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0 12px' }}>
          {sorted.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 16px' }}>No vessels found</div>}
          {sorted.map(v => {
            const u = getUnreadCount(v.id);
            const active = activeTab === v.id;
            const c = avatarColor(v.name);
            return (
              <button key={v.id} onClick={() => { onTabChange(v.id); if (isMobile) onClose(); }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 12px', margin: '1px 6px', borderRadius: 6, width: 'calc(100% - 12px)',
                background: active ? 'rgba(29,111,164,0.2)' : 'none',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, color: c.color, flexShrink: 0 }}>
                    {initials(v.name)}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: u > 0 ? 600 : active ? 500 : 400, color: active ? '#58a6ff' : u > 0 ? 'var(--text)' : 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.name}
                  </span>
                </div>
                {u > 0 && <span style={{ background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 600, borderRadius: 10, padding: '1px 6px', flexShrink: 0 }}>{u}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resize handle (desktop only) */}
      {!isMobile && (
        <div onMouseDown={onMouseDown} style={{
          width: 4, cursor: 'col-resize', background: 'transparent', flexShrink: 0,
          transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.target.style.background = 'var(--accent)'}
          onMouseLeave={e => e.target.style.background = 'transparent'}
        />
      )}
    </div>
  );
}
