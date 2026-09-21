'use client';
import { useState } from 'react';

interface Question { id: string; requirement_ids: string[]; category: string; prompt: string; answer_outline: string; difficulty: number; _state?: string; }
interface Requirement { id: string; text: string; kind: string; priority: string; }

const CATS = ['technical', 'behavioural', 'system-design', 'company-fit'] as const;
const CAT_ICONS: Record<string, string> = { technical: '⚙️', behavioural: '🤝', 'system-design': '🏗️', 'company-fit': '🏢' };
const DIFF: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Easy',   color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
  2: { label: 'Medium', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
  3: { label: 'Hard',   color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
};

function QuestionCard({ q, idx, total, note, onSaveNote, onDelete, onMoveUp, onMoveDown, onMoveCategory }: any) {
  const [mode, setMode] = useState<'view' | 'practice' | 'review'>('view');
  const [draftNote, setDraftNote] = useState(note || '');
  const d = DIFF[q.difficulty] || DIFF[2];

  const handleReveal = () => {
    onSaveNote(draftNote);
    setMode('review');
  };

  return (
    <div style={{
      borderRadius: 12, padding: '1.25rem',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--color-border)',
      transition: 'all 0.2s',
      boxShadow: mode !== 'view' ? '0 8px 24px rgba(0,0,0,0.2)' : 'none'
    }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Reorder arrows */}
        {mode === 'view' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, paddingTop: 4 }}>
            <button onClick={onMoveUp} disabled={idx === 0} className="btn-ghost" style={{ padding: '2px 5px', fontSize: '0.65rem', opacity: idx === 0 ? 0.2 : 0.6 }}>▲</button>
            <button onClick={onMoveDown} disabled={idx === total - 1} className="btn-ghost" style={{ padding: '2px 5px', fontSize: '0.65rem', opacity: idx === total - 1 ? 0.2 : 0.6 }}>▼</button>
          </div>
        )}
        
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 6, background: d.bg, color: d.color }}>
              {d.label}
            </span>
            {mode === 'view' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <select value={q.category} onChange={e => onMoveCategory(e.target.value)} className="btn-ghost" style={{ fontSize: '0.6875rem', padding: '0.25rem' }}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={onDelete} className="btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>✕</button>
              </div>
            )}
          </div>
          
          <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.6 }}>
            {q.prompt}
          </p>

          {/* Practice Mode */}
          {mode === 'practice' && (
            <div className="fade-in" style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Your Answer
              </label>
              <textarea 
                value={draftNote} 
                onChange={e => setDraftNote(e.target.value)} 
                rows={4} 
                placeholder="Draft your answer here..." 
                className="input textarea" 
                style={{ fontSize: '0.9375rem', marginBottom: '0.75rem', fontFamily: 'inherit' }} 
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleReveal} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                  Reveal Outline
                </button>
                <button onClick={() => setMode('view')} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Review Mode */}
          {mode === 'review' && (
            <div className="fade-in" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {draftNote && (
                <div style={{ padding: '1rem', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Your Answer</p>
                  <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{draftNote}</p>
                </div>
              )}
              
              <div style={{ padding: '1rem', borderRadius: 10, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Suggested Outline</p>
                <p style={{ color: 'var(--color-text)', fontSize: '0.9375rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{q.answer_outline}</p>
              </div>

              <div>
                <button onClick={() => setMode('view')} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Action Bar (View Mode) */}
          {mode === 'view' && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setMode('practice')} className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8125rem' }}>
                ✎ Practice
              </button>
              {q.answer_outline && (
                <button onClick={() => setMode('review')} className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8125rem' }}>
                  👁 Peek Answer
                </button>
              )}
              {note && (
                <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: '#10b981', marginLeft: '0.5rem' }}>
                  ✓ Has note
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props { questions: Question[]; notes: Record<string, string>; requirements: Requirement[]; onPatch: (qs: Question[], notes?: Record<string, string>) => Promise<void>; onRegenerate: (cat: string) => Promise<void>; generatingSection: string | null; }

export default function QuestionsSection({ questions, notes, requirements, onPatch, onRegenerate, generatingSection }: Props) {
  const [activeCat, setActiveCat] = useState('technical');
  const [adding, setAdding] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  const byCat = CATS.reduce((acc, c) => { acc[c] = questions.filter(q => q.category === c); return acc; }, {} as Record<string, Question[]>);

  const remove = (id: string) => onPatch(questions.filter(q => q.id !== id));
  const move = (cat: string, from: number, to: number) => {
    const arr = [...byCat[cat]]; const [item] = arr.splice(from, 1); arr.splice(to, 0, item);
    onPatch([...questions.filter(q => q.category !== cat), ...arr]);
  };
  const moveCat = (id: string, cat: string) => onPatch(questions.map(q => q.id === id ? { ...q, category: cat, _state: 'edited' } : q));
  const addQ = () => {
    if (!newPrompt.trim()) return;
    onPatch([...questions, { id: `q_user_${Date.now()}`, requirement_ids: [], category: activeCat, prompt: newPrompt, answer_outline: newAnswer, difficulty: 2, _state: 'pinned' }]);
    setNewPrompt(''); setNewAnswer(''); setAdding(false);
  };
  
  const saveNote = (id: string, text: string) => {
    onPatch(questions, { ...notes, [id]: text });
  };

  const isRegen = generatingSection?.startsWith(`questions:${activeCat}`);

  return (
    <div>
      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {CATS.map(cat => {
          const count = byCat[cat].length;
          const active = activeCat === cat;
          return (
            <button key={cat} onClick={() => setActiveCat(cat)} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600,
              border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
              background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
              borderColor: active ? 'rgba(99,102,241,0.4)' : 'var(--color-border)',
              color: active ? '#818cf8' : 'var(--color-text-muted)',
            }}>
              <span>{CAT_ICONS[cat]}</span>
              <span style={{ textTransform: 'capitalize' }}>{cat.replace('-', ' ')}</span>
              <span style={{ fontSize: '0.6875rem', padding: '0.1rem 0.45rem', borderRadius: 99, background: active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h3 style={{ fontWeight: 700, color: 'var(--color-text)', margin: 0, fontSize: '1rem' }}>
          {CAT_ICONS[activeCat]} {activeCat.replace('-', ' ')} ({byCat[activeCat].length})
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setAdding(true)} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>+ Custom Question</button>
          <button onClick={() => onRegenerate(activeCat)} disabled={!!isRegen} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.875rem' }}>
            {isRegen ? <><div className="spinner-sm" /> Generating…</> : '↻ Generate More'}
          </button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="section-card" style={{ marginBottom: '1.25rem', border: '1px solid rgba(99,102,241,0.3)' }}>
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>Add Custom Question</h4>
          <textarea value={newPrompt} onChange={e => setNewPrompt(e.target.value)} rows={2} placeholder="Question prompt…" className="input textarea" style={{ marginBottom: '0.625rem', fontSize: '0.9rem' }} />
          <textarea value={newAnswer} onChange={e => setNewAnswer(e.target.value)} rows={3} placeholder="Answer outline (optional)…" className="input textarea" style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={addQ} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>Add</button>
            <button onClick={() => { setAdding(false); setNewPrompt(''); setNewAnswer(''); }} className="btn-secondary" style={{ padding: '0.5rem 0.875rem', fontSize: '0.875rem' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Questions list */}
      {byCat[activeCat].length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1.5rem', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', color: 'var(--color-text-dim)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{CAT_ICONS[activeCat]}</div>
          <p style={{ marginBottom: '1rem', fontSize: '0.9375rem' }}>No {activeCat} questions yet.</p>
          <button onClick={() => onRegenerate(activeCat)} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}>Generate Questions</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {byCat[activeCat].map((q, i) => (
            <QuestionCard
              key={q.id} q={q} idx={i} total={byCat[activeCat].length}
              note={notes?.[q.id]}
              onSaveNote={(text: string) => saveNote(q.id, text)}
              onDelete={() => remove(q.id)}
              onMoveUp={() => move(activeCat, i, i - 1)}
              onMoveDown={() => move(activeCat, i, i + 1)}
              onMoveCategory={(cat: string) => moveCat(q.id, cat)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
