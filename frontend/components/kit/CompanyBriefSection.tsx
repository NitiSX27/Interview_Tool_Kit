'use client';
import { useState } from 'react';

interface Brief {
  summary?: string;
  about_company?: string;
  jd_relevance?: string;
  interview_process?: string;
  what_they_do?: string; // legacy
  sources?: string[];
}
interface Props {
  brief: Brief;
  onPatch: (b: Brief) => Promise<void>;
  onRegenerate: () => Promise<void>;
  isRegenerating: boolean;
}

const TABS = ['About', 'For This Role', 'Interview Process'] as const;
type Tab = typeof TABS[number];

export default function CompanyBriefSection({ brief, onPatch, onRegenerate, isRegenerating }: Props) {
  const [tab, setTab] = useState<Tab>('About');

  if (!brief) return null;

  // Support both new and legacy brief formats
  const aboutText     = brief.about_company || brief.what_they_do || '';
  const relevanceText = brief.jd_relevance  || '';
  const interviewText = brief.interview_process || 'No public information found about their interview process.';

  return (
    <div className="section-card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 0.25rem' }}>🏢 Company Brief</h2>
          {brief.summary && (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              {brief.summary}
            </p>
          )}
        </div>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="btn-secondary"
          style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', flexShrink: 0 }}
        >
          {isRegenerating
            ? <><div className="spinner-sm" />&nbsp;Regenerating…</>
            : '↻ Regenerate'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.25rem', width: '100%' }}>
        {TABS.map(t => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
            style={{ flex: 1 }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="fade-in" key={tab}>
        {tab === 'About' && (
          <>
            {aboutText ? (
              <p style={{ color: 'var(--color-text)', lineHeight: 1.75, margin: 0, fontSize: '0.9375rem' }}>
                {aboutText}
              </p>
            ) : (
              <p style={{ color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                No company information was retrieved. Try regenerating after checking the company URL.
              </p>
            )}
          </>
        )}

        {tab === 'For This Role' && (
          <>
            {relevanceText ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#818cf8', background: 'rgba(99,102,241,0.1)', padding: '0.2rem 0.625rem', borderRadius: 99 }}>
                    JD Analysis
                  </span>
                </div>
                <p style={{ color: 'var(--color-text)', lineHeight: 1.75, margin: 0, fontSize: '0.9375rem' }}>
                  {relevanceText}
                </p>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                JD relevance will appear here after regenerating with the new format.
              </p>
            )}
          </>
        )}

        {tab === 'Interview Process' && (
          <div>
            <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.75, margin: 0, fontSize: '0.9rem' }}>
                {interviewText}
              </p>
            </div>
            {brief.sources && brief.sources.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Sources crawled
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {brief.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '0.6875rem', color: '#818cf8', textDecoration: 'none',
                        background: 'rgba(99,102,241,0.08)', padding: '0.2rem 0.5rem',
                        borderRadius: 6, border: '1px solid rgba(99,102,241,0.15)',
                        maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                      }}
                    >
                      {src}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
