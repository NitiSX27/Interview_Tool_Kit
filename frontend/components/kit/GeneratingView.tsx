'use client';

const STEPS = [
  { label: 'Validating inputs', min: 0 },
  { label: 'Fetching company homepage', min: 5 },
  { label: 'Crawling company site', min: 15 },
  { label: 'Searching public discussion', min: 20 },
  { label: 'Extracting requirements', min: 25 },
  { label: 'Generating company brief', min: 35 },
  { label: 'Generating questions', min: 40 },
  { label: 'Generating flashcards', min: 60 },
  { label: 'Checking coverage', min: 70 },
  { label: 'Building study schedule', min: 80 },
  { label: 'Finalising kit', min: 90 },
];

export default function GeneratingView({ kit }: { kit: any }) {
  const pct = kit.progress || 0;
  const activeStep = [...STEPS].reverse().find(s => pct >= s.min) || STEPS[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative' }}>
      <div className="ambient">
        <div className="ambient-blob" style={{ width: 600, height: 600, background: 'radial-gradient(circle, #6366f1,#4338ca)', top: '10%', left: '10%', opacity: 0.18 }} />
        <div className="ambient-blob" style={{ width: 400, height: 400, background: 'radial-gradient(circle, #8b5cf6,#7c3aed)', bottom: '10%', right: '10%', opacity: 0.15, animationDelay: '3s' }} />
      </div>

      <div className="card-gradient-border fade-up" style={{ borderRadius: 24, padding: '2.5rem', maxWidth: 480, width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Animated icon */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="float" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: 24, fontSize: 36, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))', border: '1px solid rgba(99,102,241,0.35)', position: 'relative' }}>
            🧠
            <div style={{ position: 'absolute', inset: -4, borderRadius: 28, border: '1px solid rgba(99,102,241,0.3)', animation: 'blobPulse 2s ease-in-out infinite' }} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '1.25rem 0 0.375rem', letterSpacing: '-0.02em' }}>
            <span className="gradient-text">Generating Your Kit</span>
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
            This takes 1–3 minutes. You can close this tab.
          </p>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
            <span style={{ color: '#818cf8', fontSize: '0.875rem', fontWeight: 600 }}>{activeStep.label}…</span>
            <span style={{ color: 'var(--color-text-dim)', fontSize: '0.8125rem', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div className="progress-track" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${Math.max(pct, 3)}%` }} />
          </div>
        </div>

        {/* Steps checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {STEPS.map((step, i) => {
            const isDone = pct > step.min;
            const isActive = activeStep === step;
            return (
              <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6875rem', fontWeight: 700,
                  background: isDone ? 'rgba(16,185,129,0.15)' : isActive ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isDone ? 'rgba(16,185,129,0.4)' : isActive ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: isDone ? '#34d399' : isActive ? '#818cf8' : 'var(--color-text-dim)',
                  transition: 'all 0.3s',
                }}>
                  {isDone ? '✓' : isActive ? '·' : ''}
                </div>
                <span style={{
                  fontSize: '0.8125rem',
                  color: isDone ? 'var(--color-text-muted)' : isActive ? 'var(--color-text)' : 'var(--color-text-dim)',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'color 0.3s',
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
