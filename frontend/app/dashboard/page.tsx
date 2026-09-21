'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { kitsApi } from '@/lib/api';

interface KitSummary {
  _id: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  createdAt: string;
  source?: { company?: string; role?: string; company_url?: string };
  role?: { title?: string };
  progress?: number;
  errorMessage?: string;
}

const STATUS = {
  done:       { label: 'Ready',       cls: 'badge-success' },
  processing: { label: 'Generating…', cls: 'badge-processing' },
  pending:    { label: 'Queued',      cls: 'badge-pending' },
  error:      { label: 'Error',       cls: 'badge-error' },
};

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    kitsApi.list()
      .then((d: any) => setKits(d.kits || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Delete this kit?')) return;
    await kitsApi.delete(id);
    setKits(prev => prev.filter(k => k._id !== id));
  };

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Ambient */}
      <div className="ambient">
        <div className="ambient-blob" style={{ width: 600, height: 600, background: 'radial-gradient(circle, #6366f1, #4338ca)', top: '-20%', right: '-15%', opacity: 0.15 }} />
        <div className="ambient-blob" style={{ width: 400, height: 400, background: 'radial-gradient(circle, #8b5cf6, #7c3aed)', bottom: '-10%', left: '-10%', opacity: 0.12, animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,5,15,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <span style={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '-0.01em' }}>
              <span className="gradient-text">Interview Prep Kit</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--color-text-dim)', fontSize: '0.8125rem', display: 'none' }}>{user?.email}</span>
            <button onClick={async () => { await logout(); router.replace('/login'); }} className="btn-ghost">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem', position: 'relative', zIndex: 1 }}>
        {/* Page header */}
        <div className="fade-up" style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.03em' }}>
            Your <span className="gradient-text">Prep Kits</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1.0625rem', margin: 0 }}>
            Each kit is a personalised study plan built from a job description.
          </p>
        </div>

        {/* CTA row */}
        <div className="fade-up delay-100" style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/new" id="create-kit-btn" className="btn-primary" style={{ textDecoration: 'none' }}>
            <span>+</span><span>New Prep Kit</span>
          </Link>
          {kits.length > 0 && (
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem', margin: 0 }}>
              {kits.length} kit{kits.length !== 1 ? 's' : ''} total
            </p>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))' }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 180, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : kits.length === 0 ? (
          <div className="card-gradient-border fade-up" style={{ borderRadius: 24, padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: '1rem' }} className="float">📋</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--color-text)' }}>No kits yet</h2>
            <p style={{ color: 'var(--color-text-muted)', margin: '0 0 1.5rem' }}>Create your first prep kit from a job description.</p>
            <Link href="/new" className="btn-primary" style={{ textDecoration: 'none' }}>Create your first kit</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))' }}>
            {kits.map((kit, idx) => {
              const st = STATUS[kit.status] || STATUS.pending;
              const title = kit.role?.title || kit.source?.role || 'Untitled Role';
              const company = kit.source?.company || kit.source?.company_url || '—';
              const date = new Date(kit.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <div
                  key={kit._id}
                  className={`glass-hover fade-up`}
                  style={{ borderRadius: 20, padding: '1.5rem', animationDelay: `${idx * 0.05}s`, position: 'relative', overflow: 'hidden' }}
                >
                  {/* Subtle top gradient accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: kit.status === 'done' ? 'linear-gradient(90deg, #10b981, #06b6d4)' : kit.status === 'error' ? '#ef4444' : 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '20px 20px 0 0' }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                    <button
                      onClick={e => handleDelete(kit._id, e)}
                      className="btn-ghost"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', opacity: 0.5 }}
                      title="Delete kit"
                    >✕</button>
                  </div>

                  <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', margin: '0 0 0.25rem', color: 'var(--color-text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title}
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '0 0 0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {company}
                  </p>
                  <p style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem', margin: '0 0 1rem' }}>{date}</p>

                  {kit.status === 'processing' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${Math.max(kit.progress || 5, 5)}%` }} />
                      </div>
                      <p style={{ color: 'var(--color-text-dim)', fontSize: '0.6875rem', marginTop: '0.375rem' }}>
                        {kit.progress || 5}% complete
                      </p>
                    </div>
                  )}

                  {kit.status === 'error' && (
                    <p style={{ color: '#fca5a5', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{kit.errorMessage}</p>
                  )}

                  {(kit.status === 'done' || kit.status === 'processing') && (
                    <Link
                      href={`/kit/${kit._id}`}
                      style={{
                        display: 'block', textAlign: 'center', textDecoration: 'none',
                        padding: '0.625rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600,
                        background: kit.status === 'done' ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))' : 'rgba(255,255,255,0.04)',
                        border: '1px solid',
                        borderColor: kit.status === 'done' ? 'rgba(99,102,241,0.35)' : 'var(--color-border)',
                        color: kit.status === 'done' ? 'var(--color-primary-light)' : 'var(--color-text-dim)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {kit.status === 'done' ? 'Open Kit →' : 'View Progress →'}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
