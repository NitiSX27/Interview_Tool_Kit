'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { kitsApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

interface Flashcard { id: string; front: string; back: string; }
interface PracticeRecord { flashcardId: string; confidence: number; }

function sortByConfidence(cards: Flashcard[], history: PracticeRecord[]) {
  const latest: Record<string, number> = {};
  for (const r of history) latest[r.flashcardId] = r.confidence;
  return [...cards].sort((a, b) => (latest[a.id] ?? 0) - (latest[b.id] ?? 0));
}

const CONF = [
  { value: 1, label: "Didn't know", cls: 'wrong', emoji: '😕' },
  { value: 2, label: 'Kinda knew', cls: 'partial', emoji: '😐' },
  { value: 3, label: 'Got it!', cls: 'good', emoji: '😊' },
];

export default function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [kit, setKit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [history, setHistory] = useState<PracticeRecord[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    kitsApi.get(id).then((d: any) => {
      setKit(d.kit);
      setCards(sortByConfidence(d.kit.flashcards || [], d.kit.practiceHistory || []));
    }).catch(() => router.replace('/dashboard')).finally(() => setLoading(false));
  }, [id, user]);

  const current = cards[idx];

  const rate = async (confidence: number) => {
    const rec = { flashcardId: current.id, confidence };
    setHistory(h => [...h, rec]);
    try { await kitsApi.recordPractice(id, current.id, confidence); } catch {}
    if (idx + 1 >= cards.length) { setDone(true); }
    else { setIdx(i => i + 1); setFlipped(false); }
  };

  const restart = () => {
    setCards(sortByConfidence(cards, history));
    setIdx(0); setFlipped(false); setHistory([]); setDone(false);
  };

  if (authLoading || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );
  if (!kit) return null;

  const pct = Math.round((idx / Math.max(cards.length, 1)) * 100);

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Ambient */}
      <div className="ambient">
        <div className="ambient-blob" style={{ width: 600, height: 600, background: 'radial-gradient(circle, #6366f1, #4338ca)', top: '20%', left: '50%', transform: 'translateX(-50%)', opacity: 0.08 }} />
      </div>

      {/* Header */}
      <header style={{ background: 'rgba(5,5,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href={`/kit/${id}`} style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem', textDecoration: 'none' }}>← Back to kit</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>🎴</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Practice Mode</span>
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-dim)' }}>
            {history.length} / {cards.length}
          </span>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 640, width: '100%', margin: '0 auto', padding: '2.5rem 1.5rem', position: 'relative', zIndex: 1 }}>
        {cards.length === 0 ? (
          <div className="card-gradient-border fade-up" style={{ borderRadius: 24, padding: '4rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>🎴</div>
            <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No flashcards yet</h2>
            <Link href={`/kit/${id}`} style={{ color: 'var(--color-primary-light)', textDecoration: 'none' }}>← Generate them from the kit</Link>
          </div>
        ) : done ? (
          <div className="card-gradient-border fade-up" style={{ borderRadius: 24, padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: '1.25rem' }} className="float">🎉</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
              <span className="gradient-text">Session Complete!</span>
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>You reviewed all {cards.length} cards.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
              {CONF.map(c => {
                const count = history.filter(r => r.confidence === c.value).length;
                return (
                  <div key={c.value} className="section-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: '0.375rem' }}>{c.emoji}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '0.25rem' }}>{count}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{c.label}</div>
                  </div>
                );
              })}
            </div>

            {history.some(r => r.confidence < 3) && (
              <p style={{ color: '#818cf8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Next session will prioritise cards you struggled with.
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={restart} className="btn-primary">Practice again</button>
              <Link href={`/kit/${id}`} className="btn-secondary" style={{ textDecoration: 'none' }}>Back to kit</Link>
            </div>
          </div>
        ) : (
          <div className="fade-in">
            {/* Progress */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.8125rem' }}>Card {idx + 1} of {cards.length}</span>
                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.8125rem' }}>{pct}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              {/* Mini history dots */}
              {history.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                  {history.slice(-8).map((r, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: r.confidence === 3 ? '#10b981' : r.confidence === 2 ? '#f59e0b' : '#ef4444' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Flashcard */}
            <div
              className="perspective-1000"
              style={{ height: 300, marginBottom: '2rem', cursor: 'pointer' }}
              onClick={() => setFlipped(f => !f)}
              onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') setFlipped(f => !f); }}
              tabIndex={0}
              role="button"
              aria-label={flipped ? 'Card back' : 'Click to reveal answer'}
            >
              <div className={`card-flip-inner ${flipped ? 'flipped' : ''}`}>
                {/* Front */}
                <div className="card-face card-gradient-border" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem', textAlign: 'center' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-primary-light)', background: 'rgba(99,102,241,0.12)', padding: '0.25rem 0.75rem', borderRadius: 99 }}>Question</span>
                  </div>
                  <p style={{ fontSize: '1.1875rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.6, margin: 0 }}>
                    {current?.front}
                  </p>
                  <p style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem', marginTop: '1.5rem', margin: '1.5rem 0 0' }}>
                    Click or press Space to reveal
                  </p>
                </div>
                {/* Back */}
                <div className="card-face card-back-face" style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '2.5rem', textAlign: 'center',
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-card)',
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#34d399', background: 'rgba(16,185,129,0.12)', padding: '0.25rem 0.75rem', borderRadius: 99 }}>Answer</span>
                  </div>
                  <p style={{ fontSize: '1.0625rem', color: 'var(--color-text)', lineHeight: 1.65, margin: 0 }}>
                    {current?.back}
                  </p>
                </div>
              </div>
            </div>

            {/* Confidence buttons */}
            {flipped ? (
              <div>
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem', fontWeight: 500 }}>
                  How well did you know this?
                </p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {CONF.map(c => (
                    <button
                      key={c.value}
                      onClick={() => rate(c.value)}
                      className={`conf-btn ${c.cls}`}
                    >
                      <span style={{ fontSize: '1.75rem' }}>{c.emoji}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem' }}>Flip the card to rate your confidence</p>
                <button
                  onClick={() => { if (idx + 1 >= cards.length) setDone(true); else { setIdx(i => i + 1); setFlipped(false); } }}
                  className="btn-ghost"
                  style={{ marginTop: '0.75rem', fontSize: '0.8125rem' }}
                >
                  Skip →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
