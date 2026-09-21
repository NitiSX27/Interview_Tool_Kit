'use client';
import { useState } from 'react';

interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
  done?: boolean;
  completedQuestionIds?: string[];
}
interface Schedule { days_available: number; days: ScheduleDay[]; }
interface Question { id: string; prompt: string; category: string; difficulty: number; }

const DIFF_DOT: Record<number, { bg: string; label: string }> = {
  1: { bg: '#10b981', label: 'Easy' },
  2: { bg: '#f59e0b', label: 'Medium' },
  3: { bg: '#ef4444', label: 'Hard' },
};

function DayCard({
  day, dayIndex, questions, allDays,
  onUpdate, onMoveQuestion,
}: {
  day: ScheduleDay;
  dayIndex: number;
  questions: Question[];
  allDays: ScheduleDay[];
  onUpdate: (d: ScheduleDay) => void;
  onMoveQuestion: (questionId: string, fromDay: number, toDay: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingFocus, setEditingFocus] = useState(false);
  const [focusDraft, setFocusDraft] = useState(day.focus);

  const qMap = questions.reduce((acc: Record<string, Question>, q) => { acc[q.id] = q; return acc; }, {});
  const dayQs = day.question_ids.map(id => qMap[id]).filter(Boolean);
  const completed = day.completedQuestionIds || [];
  const taskPct = dayQs.length ? Math.round((completed.length / dayQs.length) * 100) : 0;
  const isDayDone = day.done || taskPct === 100;

  const toggleTask = (qid: string) => {
    const current = day.completedQuestionIds || [];
    const updated = current.includes(qid)
      ? current.filter(id => id !== qid)
      : [...current, qid];
    const allDone = day.question_ids.every(id => updated.includes(id));
    onUpdate({ ...day, completedQuestionIds: updated, done: allDone });
  };

  const toggleDayDone = () => {
    if (isDayDone) {
      onUpdate({ ...day, done: false, completedQuestionIds: [] });
    } else {
      onUpdate({ ...day, done: true, completedQuestionIds: day.question_ids });
    }
  };

  return (
    <div style={{
      borderRadius: 16,
      background: isDayDone ? 'rgba(16,185,129,0.03)' : 'rgba(18,18,42,0.6)',
      border: `1px solid ${isDayDone ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.1)'}`,
      overflow: 'hidden', transition: 'all 0.3s',
    }}>
      {/* Day header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1.25rem', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        {/* Day badge / check */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleDayDone(); }}
          style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: isDayDone ? '1.1rem' : '1rem',
            background: isDayDone ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(99,102,241,0.12)',
            color: isDayDone ? 'white' : '#818cf8',
            boxShadow: isDayDone ? '0 4px 12px rgba(16,185,129,0.3)' : 'none',
            transition: 'all 0.25s',
          }}
          title={isDayDone ? 'Mark incomplete' : 'Mark all complete'}
        >
          {isDayDone ? '✓' : day.day}
        </button>

        {/* Focus label (editable) */}
        <div style={{ flex: 1, minWidth: 0 }} onClick={e => e.stopPropagation()}>
          {editingFocus ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                value={focusDraft}
                onChange={e => setFocusDraft(e.target.value)}
                className="input"
                style={{ flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.9rem' }}
                autoFocus
                onBlur={() => { onUpdate({ ...day, focus: focusDraft }); setEditingFocus(false); }}
                onKeyDown={e => { if (e.key === 'Enter') { onUpdate({ ...day, focus: focusDraft }); setEditingFocus(false); } }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'text' }}
              onClick={() => { setFocusDraft(day.focus); setEditingFocus(true); }}>
              <p style={{ fontWeight: 700, fontSize: '0.9375rem', margin: 0, color: isDayDone ? '#34d399' : 'var(--color-text)', transition: 'color 0.3s' }}>
                {day.focus}
              </p>
              <span style={{ fontSize: '0.625rem', color: 'var(--color-text-dim)', opacity: 0.5 }}>✎</span>
            </div>
          )}
        </div>

        {/* Right meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {dayQs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: 42, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${taskPct}%`, background: isDayDone ? '#10b981' : 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.4s' }} />
              </div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', fontWeight: 500 }}>
                {completed.length}/{dayQs.length}
              </span>
            </div>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>⏱ {day.minutes}m</span>
          <span style={{ color: 'var(--color-text-dim)', fontSize: '0.8125rem', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </div>

      {/* Expanded: question task list */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '0.875rem 1.25rem 1.25rem' }}>
          {dayQs.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-dim)', margin: 0, fontStyle: 'italic' }}>
              Review day — revisit previous topics and flashcards.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {dayQs.map(q => {
                const isTaskDone = completed.includes(q.id);
                const d = DIFF_DOT[q.difficulty] || DIFF_DOT[2];
                return (
                  <div key={q.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    padding: '0.625rem 0.75rem', borderRadius: 10,
                    background: isTaskDone ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isTaskDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'}`,
                    transition: 'all 0.2s',
                  }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(q.id)}
                      style={{
                        width: 20, height: 20, borderRadius: 6, border: `2px solid ${isTaskDone ? '#10b981' : 'rgba(255,255,255,0.2)'}`,
                        background: isTaskDone ? '#10b981' : 'transparent', cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', color: 'white', fontWeight: 700,
                        transition: 'all 0.2s',
                      }}
                    >
                      {isTaskDone ? '✓' : ''}
                    </button>

                    {/* Question text */}
                    <p style={{
                      flex: 1, margin: 0, fontSize: '0.875rem', lineHeight: 1.5,
                      color: isTaskDone ? 'var(--color-text-dim)' : 'var(--color-text)',
                      textDecoration: isTaskDone ? 'line-through' : 'none',
                      transition: 'all 0.2s',
                    }}>
                      {q.prompt}
                    </p>

                    {/* Diff + move */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.bg }} title={d.label} />
                      {/* Move to another day */}
                      <select
                        value={dayIndex}
                        onChange={e => onMoveQuestion(q.id, dayIndex, Number(e.target.value))}
                        className="btn-ghost"
                        style={{ fontSize: '0.6875rem', padding: '0.125rem 0.25rem', cursor: 'pointer', maxWidth: 70 }}
                        title="Move to day…"
                        onClick={e => e.stopPropagation()}
                      >
                        {allDays.map((_, i) => (
                          <option key={i} value={i}>Day {i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Edit day minutes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>Day duration:</span>
            <input
              type="number" min={10} max={240} step={5}
              value={day.minutes}
              onChange={e => onUpdate({ ...day, minutes: Math.max(10, Math.min(240, Number(e.target.value))) })}
              className="input"
              style={{ width: 70, padding: '0.25rem 0.375rem', fontSize: '0.8125rem', textAlign: 'center' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>min</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  schedule: Schedule;
  questions: Question[];
  onRegenerate: () => Promise<void>;
  isRegenerating: boolean;
  onPatch: (schedule: Schedule) => void;
}

export default function ScheduleSection({ schedule, questions, onRegenerate, isRegenerating, onPatch }: Props) {
  if (!schedule) return null;

  const completedDays = schedule.days.filter(d => d.done || (d.completedQuestionIds?.length === d.question_ids.length && d.question_ids.length > 0)).length;
  const totalTasks = schedule.days.reduce((s, d) => s + d.question_ids.length, 0);
  const completedTasks = schedule.days.reduce((s, d) => s + (d.completedQuestionIds?.length || 0), 0);
  const overallPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const updateDay = (idx: number, updated: ScheduleDay) => {
    const newDays = [...schedule.days];
    newDays[idx] = updated;
    onPatch({ ...schedule, days: newDays });
  };

  const moveQuestion = (questionId: string, fromDayIdx: number, toDayIdx: number) => {
    if (fromDayIdx === toDayIdx) return;
    const newDays = schedule.days.map((d, i) => {
      if (i === fromDayIdx) return { ...d, question_ids: d.question_ids.filter(id => id !== questionId) };
      if (i === toDayIdx) return { ...d, question_ids: [...d.question_ids, questionId] };
      return d;
    });
    onPatch({ ...schedule, days: newDays });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 0.375rem' }}>📅 Study Schedule</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', margin: 0 }}>
            {schedule.days_available}-day plan · {completedDays}/{schedule.days.length} days · {completedTasks}/{totalTasks} tasks
          </p>
        </div>
        <button onClick={onRegenerate} disabled={isRegenerating} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.875rem' }}>
          {isRegenerating ? <><div className="spinner-sm" /> Rebuilding…</> : '↻ Rebuild schedule'}
        </button>
      </div>

      {/* Overall progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.125rem', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${overallPct}%`, background: overallPct === 100 ? '#10b981' : 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.4s' }} />
        </div>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: overallPct === 100 ? '#34d399' : 'var(--color-text)', minWidth: 36, textAlign: 'right' }}>
          {overallPct}%
        </span>
        {overallPct === 100 && <span style={{ fontSize: '1rem' }}>🎉</span>}
      </div>

      {/* Days */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {schedule.days.map((day, idx) => (
          <DayCard
            key={day.day}
            day={day}
            dayIndex={idx}
            questions={questions}
            allDays={schedule.days}
            onUpdate={updated => updateDay(idx, updated)}
            onMoveQuestion={moveQuestion}
          />
        ))}
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '1rem', textAlign: 'center' }}>
        Click a day to expand · Check tasks to track progress · Drag-select a day to edit focus · Move questions between days
      </p>
    </div>
  );
}
