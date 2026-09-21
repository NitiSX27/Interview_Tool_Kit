'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Flashcard { id: string; front: string; back: string; requirement_ids: string[]; _state?: string; }

function FlashCardPreview({ card, onDelete }: { card: Flashcard; onDelete: () => void; }) {
  return (
    <div style={{
      borderRadius: 16, padding: '1.25rem',
      background: 'linear-gradient(145deg, rgba(30, 30, 40, 0.4), rgba(20, 20, 30, 0.6))',
      border: '1px solid var(--color-border)',
      display: 'flex', flexDirection: 'column', height: '100%',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
      
      <div style={{ flex: 1, marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>Front</p>
        <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', margin: 0, lineHeight: 1.5 }}>{card.front}</p>
      </div>
      
      <div style={{ padding: '0.875rem', background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>Back Preview</p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
          {card.back}
        </p>
      </div>

      <button 
        onClick={onDelete} 
        style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', padding: '0.25rem' }}
        title="Remove card"
      >
        ✕
      </button>
    </div>
  );
}

interface Props { flashcards: Flashcard[]; onPatch: (fs: Flashcard[]) => Promise<void>; onRegenerate: () => Promise<void>; isRegenerating: boolean; }

export default function FlashcardsSection({ flashcards, onPatch, onRegenerate, isRegenerating }: Props) {
  const params = useParams();
  const kitId = params.id as string;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.25rem' }}>🎴 Flashcards Bank</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', margin: 0 }}>
            {flashcards.length} cards generated from JD requirements and company profile.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onRegenerate} disabled={isRegenerating} className="btn-secondary" style={{ fontSize: '0.8125rem', padding: '0.4rem 1rem' }}>
            {isRegenerating ? <><div className="spinner-sm" /> Generating…</> : '↻ Generate More'}
          </button>
          <Link href={`/kit/${kitId}/practice`} className="btn-primary" style={{ fontSize: '0.8125rem', padding: '0.4rem 1.25rem', textDecoration: 'none' }}>
            ▶ Start Practice Session
          </Link>
        </div>
      </div>

      {flashcards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎴</div>
          <p style={{ marginBottom: '1.25rem', fontSize: '0.9375rem' }}>No flashcards available.</p>
          <button onClick={onRegenerate} disabled={isRegenerating} className="btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '0.875rem' }}>
            {isRegenerating ? 'Generating...' : 'Generate Flashcards'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {flashcards.map(card => (
            <FlashCardPreview
              key={card.id} card={card}
              onDelete={() => onPatch(flashcards.filter(f => f.id !== card.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
