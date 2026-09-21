'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(email, password);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative' }}>
      <div className="ambient">
        <div className="ambient-blob" style={{ width: 500, height: 500, background: 'radial-gradient(circle, #8b5cf6, #7c3aed)', top: '-10%', right: '-10%' }} />
        <div className="ambient-blob" style={{ width: 400, height: 400, background: 'radial-gradient(circle, #6366f1, #4338ca)', bottom: '-5%', left: '-8%', animationDelay: '3s' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }} className="fade-up">
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 20, marginBottom: '1rem',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.3))',
            border: '1px solid rgba(139,92,246,0.4)', fontSize: 28,
            boxShadow: '0 0 40px rgba(139,92,246,0.2)',
          }}>✨</div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
            <span className="gradient-text">Create Account</span>
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', margin: 0 }}>
            Start your interview prep journey
          </p>
        </div>

        <div className="card-gradient-border fade-up delay-100" style={{ borderRadius: 20, padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem', letterSpacing: '0.025em', textTransform: 'uppercase' }}>Email</label>
              <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input" placeholder="you@example.com" />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem', letterSpacing: '0.025em', textTransform: 'uppercase' }}>
                Password <span style={{ color: 'var(--color-text-dim)', fontWeight: 400, textTransform: 'none' }}>(min 8 chars)</span>
              </label>
              <input id="reg-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input" placeholder="••••••••" />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1.25rem', color: '#fca5a5', fontSize: '0.875rem' }}>
                ⚠ {error}
              </div>
            )}

            <button id="register-submit" type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}>
              {loading ? <><div className="spinner" /><span>Creating account…</span></> : <span>Create account →</span>}
            </button>
          </form>

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '1.5rem', paddingTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem', margin: 0 }}>
              Already have an account?{' '}
              <Link href="/login" style={{ color: 'var(--color-primary-light)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
