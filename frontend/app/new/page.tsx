'use client';
import { useState, FormEvent, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { kitsApi } from '@/lib/api';

export default function NewKitPage() {
  const router = useRouter();
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'single' | 'batch'>('single');
  const fileRef = useRef<HTMLInputElement>(null);
  const [batchStatus, setBatchStatus] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!jd.trim()) { setError('Please paste the job description'); return; }
    if (!companyUrl.trim()) { setError('Please enter the company website URL'); return; }
    setLoading(true);
    try {
      const data = await kitsApi.create({ jd, companyUrl, days });
      router.push(`/kit/${data.kitId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create kit');
      setLoading(false);
    }
  };

  const handleBatch = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError('Select a JSON file'); return; }
    setError(''); setBatchStatus('Reading…');
    try {
      const text = await file.text();
      const cases = JSON.parse(text);
      setBatchStatus(`Submitting ${cases.length} cases…`);
      await kitsApi.batchCreate(cases);
      setBatchStatus('Queued! Redirecting…');
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err: any) { setError(err.message || 'Batch failed'); setBatchStatus(''); }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="ambient">
        <div className="ambient-blob" style={{ width: 500, height: 500, background: 'radial-gradient(circle, #6366f1,#4338ca)', top: 0, right: '-10%', opacity: 0.12 }} />
      </div>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,5,15,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard" style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s' }}>
            ← Dashboard
          </Link>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>New Kit</span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem', position: 'relative', zIndex: 1 }}>
        <div className="fade-up" style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.25rem)', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.03em' }}>
            Create a <span className="gradient-text">Prep Kit</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', margin: 0 }}>
            Paste a job description and company URL. The AI does the rest — company research, question bank, flashcards, and a day-by-day study schedule.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="fade-up delay-100" style={{ marginBottom: '2rem' }}>
          <div className="tab-bar" style={{ width: 'fit-content' }}>
            <button className={`tab ${tab === 'single' ? 'active' : ''}`} onClick={() => setTab('single')}>Single JD</button>
            <button className={`tab ${tab === 'batch' ? 'active' : ''}`} onClick={() => setTab('batch')}>Batch Upload</button>
          </div>
        </div>

        {tab === 'single' ? (
          <form onSubmit={handleSubmit} className="fade-up delay-200">
            {/* JD textarea */}
            <div className="section-card" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Job Description <span style={{ color: '#f87171' }}>*</span>
              </label>
              <textarea
                id="jd-input"
                value={jd}
                onChange={e => setJd(e.target.value)}
                rows={14}
                placeholder="Paste the full job description here…"
                className="input textarea"
                style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.875rem', lineHeight: 1.7 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.6875rem' }}>{jd.length.toLocaleString()} characters</span>
              </div>
            </div>

            {/* URL + Days */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="section-card">
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Company Website <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  id="company-url"
                  type="text"
                  value={companyUrl}
                  onChange={e => setCompanyUrl(e.target.value)}
                  placeholder="https://acme.com"
                  className="input"
                />
              </div>
              <div className="section-card" style={{ minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Days until interview
                </label>
                <input
                  id="days-input"
                  type="number"
                  min={1} max={365}
                  value={days}
                  onChange={e => setDays(Number(e.target.value))}
                  className="input"
                  style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, padding: '0.5rem' }}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '1.25rem', color: '#fca5a5', fontSize: '0.875rem' }}>
                ⚠ {error}
              </div>
            )}

            <button
              id="generate-kit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '1rem', fontSize: '1.0625rem', borderRadius: 16 }}
            >
              {loading
                ? <><div className="spinner" /><span>Creating kit…</span></>
                : <span>✨ Generate Prep Kit</span>
              }
            </button>
            <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.75rem', marginTop: '0.875rem' }}>
              Generation takes 1–3 minutes. You can leave and return — kit will be ready in your dashboard.
            </p>
          </form>
        ) : (
          <div className="section-card fade-up delay-200">
            <h3 style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.5rem' }}>Batch Upload</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Upload a JSON array of job description cases:</p>
            <pre style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: '1rem', fontSize: '0.75rem', color: '#67e8f9', overflowX: 'auto', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
{`[{ "id": "case-01", "jd": "...", "companyUrl": "https://acme.com", "days": 5 }]`}
            </pre>

            <input ref={fileRef} type="file" accept=".json" id="batch-file" style={{ display: 'none' }} />
            <label htmlFor="batch-file" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '1.5rem', borderRadius: 12, cursor: 'pointer',
              border: '2px dashed rgba(99,102,241,0.25)', color: 'var(--color-text-muted)',
              transition: 'all 0.2s', marginBottom: '1rem', fontSize: '0.9375rem',
            }}>
              <span>📁</span> Click to select JSON file
            </label>

            {batchStatus && <p style={{ color: '#818cf8', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{batchStatus}</p>}
            {error && <p style={{ color: '#fca5a5', fontSize: '0.875rem', marginBottom: '0.75rem' }}>⚠ {error}</p>}
            <button onClick={handleBatch} className="btn-primary" style={{ width: '100%', padding: '0.875rem' }}>
              Upload and Generate All
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
