import { useState } from 'react';

export default function VesselSettings({ vessels, visibleVessels, onSave, onClose }) {
  const [selected, setSelected] = useState(visibleVessels.length > 0 ? visibleVessels : vessels.map(v => v.id));

  function toggle(id) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-lg)', width: 400, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>My vessel tabs</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Choose which vessels appear in your tab bar</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 18 }}>×</button>
        </div>
        <div style={{ padding: '12px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ padding: '8px 12px', background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
            Common and All messages tabs are always visible for everyone.
          </div>
          {vessels.map(v => {
            const checked = selected.includes(v.id);
            return (
              <div key={v.id} onClick={() => toggle(v.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: checked ? 'var(--accent-bg)' : 'var(--bg3)', borderRadius: 'var(--radius)', border: `1px solid ${checked ? 'rgba(29,111,164,0.4)' : 'var(--border)'}`, cursor: 'pointer' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: checked ? 'var(--accent)' : 'var(--bg)', border: `1px solid ${checked ? 'var(--accent)' : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {checked && <span style={{ color: 'white', fontSize: 11, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, fontWeight: checked ? 500 : 400, color: checked ? 'var(--text)' : 'var(--text2)' }}>{v.name}</span>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', color: 'var(--text2)', fontSize: 13 }}>Cancel</button>
          <button onClick={() => onSave(selected)} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius)', color: 'white', fontSize: 13, fontWeight: 500 }}>Save</button>
        </div>
      </div>
    </div>
  );
}
