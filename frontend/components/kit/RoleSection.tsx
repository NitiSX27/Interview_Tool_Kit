'use client';
import { useState } from 'react';

interface Requirement { id: string; text: string; kind: string; priority: string; }
interface Role { title: string; seniority: string; responsibilities: string[]; requirements: Requirement[]; }

const KIND_STYLE: Record<string, { bg: string; color: string }> = {
  technical:   { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8' },
  behavioural: { bg: 'rgba(139,92,246,0.12)',  color: '#c4b5fd' },
  domain:      { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24' },
};

export default function RoleSection({ role, onPatch }: { role: Role; onPatch: (r: Role) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  if (!role) return null;
  const musts = role.requirements?.filter(r => r.priority === 'must') || [];
  const nices = role.requirements?.filter(r => r.priority === 'nice') || [];

  return (
    <div className="section-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>📋 Role Breakdown</h2>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 99, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)' }}>
            {musts.length} must
          </span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-dim)', border: '1px solid var(--color-border)' }}>
            {nices.length} nice
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '0.8125rem', padding: '0.25rem 0.75rem', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
          {role.title}
        </span>
        {role.seniority && (
          <span style={{ fontSize: '0.8125rem', padding: '0.25rem 0.75rem', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
            {role.seniority}
          </span>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>Must-have requirements</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {musts.map(req => {
            const s = KIND_STYLE[req.kind] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--color-text-dim)' };
            return (
              <div key={req.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 6, background: s.bg, color: s.color, flexShrink: 0, marginTop: 2 }}>
                  {req.kind}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.5 }}>{req.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {nices.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.875rem' }}>
          <button onClick={() => setExpanded(!expanded)} className="btn-ghost" style={{ padding: '0.25rem 0', fontSize: '0.8125rem', color: 'var(--color-text-dim)' }}>
            {expanded ? '▾' : '▸'} {nices.length} nice-to-have{nices.length !== 1 ? 's' : ''}
          </button>
          {expanded && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.7 }}>
              {nices.map(req => {
                const s = KIND_STYLE[req.kind] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--color-text-dim)' };
                return (
                  <div key={req.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                    <span style={{ fontSize: '0.6875rem', padding: '0.2rem 0.5rem', borderRadius: 6, background: s.bg, color: s.color, flexShrink: 0, marginTop: 2 }}>{req.kind}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{req.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {role.responsibilities?.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.875rem', marginTop: '0.875rem' }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>Responsibilities</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {role.responsibilities.map((r, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                <span style={{ color: '#6366f1', marginTop: 4 }}>›</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
