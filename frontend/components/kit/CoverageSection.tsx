'use client';

interface Coverage { uncovered_requirement_ids: string[]; passes: number; }
interface Requirement { id: string; text: string; }
interface Props { coverage: Coverage; requirements: Requirement[]; }

export default function CoverageSection({ coverage, requirements }: Props) {
  if (!coverage) return null;
  const uncovered = coverage.uncovered_requirement_ids || [];
  const isPassing = uncovered.length === 0;

  return (
    <div className="section-card" style={{ borderTop: `3px solid ${isPassing ? '#10b981' : '#f59e0b'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', background: isPassing ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
          {isPassing ? '✅' : '⚠️'}
        </div>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', margin: 0, color: 'var(--color-text)' }}>Coverage Report</h3>
          <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', margin: 0 }}>{coverage.passes} check pass{coverage.passes !== 1 ? 'es' : ''}</p>
        </div>
      </div>

      {isPassing ? (
        <div style={{ padding: '0.75rem', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <p style={{ color: '#34d399', fontSize: '0.875rem', margin: 0, fontWeight: 500 }}>
            All must-have requirements are covered.
          </p>
        </div>
      ) : (
        <div>
          <p style={{ color: '#fbbf24', fontSize: '0.8125rem', marginBottom: '0.625rem', fontWeight: 600 }}>
            {uncovered.length} uncovered requirement{uncovered.length !== 1 ? 's' : ''}:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {uncovered.map(reqId => {
              const req = requirements?.find(r => r.id === reqId);
              return (
                <div key={reqId} style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem 0.625rem', background: 'rgba(245,158,11,0.05)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.1)' }}>
                  <span style={{ color: '#f59e0b', flexShrink: 0 }}>•</span>
                  {req?.text || reqId}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
