'use client';
import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { kitsApi } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import GeneratingView from '@/components/kit/GeneratingView';
import CompanyBriefSection from '@/components/kit/CompanyBriefSection';
import RoleSection from '@/components/kit/RoleSection';
import QuestionsSection from '@/components/kit/QuestionsSection';
import FlashcardsSection from '@/components/kit/FlashcardsSection';
import ScheduleSection from '@/components/kit/ScheduleSection';
import CoverageSection from '@/components/kit/CoverageSection';

const TABS = ['Overview', 'Questions', 'Flashcards', 'Schedule'] as const;
type Tab = typeof TABS[number];

const TAB_ICONS: Record<string, string> = {
  Overview: '🏢', Questions: '❓', Flashcards: '🎴', Schedule: '📅',
};

export default function KitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [kit, setKit] = useState<any>(null);
  const [loadingKit, setLoadingKit] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => { if (!authLoading && !user) router.replace('/login'); }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    kitsApi.get(id)
      .then((d: any) => setKit(d.kit))
      .catch(() => router.replace('/dashboard'))
      .finally(() => setLoadingKit(false));
  }, [id, user]);

  useEffect(() => {
    if (!kit || (kit.status !== 'processing' && kit.status !== 'pending')) return;
    const es = new EventSource(kitsApi.streamUrl(id), { withCredentials: true });
    esRef.current = es;
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setKit((prev: any) => ({ ...prev, ...data }));
      if (data.status === 'done') {
        kitsApi.get(id).then((d: any) => setKit(d.kit)).catch(console.error);
        es.close();
      }
      if (data.status === 'error') es.close();
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [kit?.status, id]);

  const handlePatch = async (updates: Record<string, any>) => {
    const updated = await kitsApi.patch(id, updates);
    setKit(updated.kit);
  };

  const handleRegenerate = async (section: string, category?: string) => {
    const key = section + (category ? `:${category}` : '');
    setGeneratingSection(key);
    try {
      const result = await kitsApi.regenerate(id, section, category);
      setKit((prev: any) => {
        if (result.section === 'questions') return { ...prev, ...result.data };
        if (result.section === 'company_brief') return { ...prev, company_brief: result.data };
        if (result.section === 'schedule') return { ...prev, schedule: result.data };
        if (result.section === 'flashcards') return { ...prev, flashcards: result.data };
        return prev;
      });
    } finally { setGeneratingSection(null); }
  };

  if (authLoading || loadingKit) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );
  if (!kit) return null;

  if (kit.status === 'processing' || kit.status === 'pending') return <GeneratingView kit={kit} />;

  if (kit.status === 'error') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card-gradient-border fade-up" style={{ borderRadius: 24, padding: '3rem 2rem', textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 48, marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Generation Failed</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{kit.errorMessage || 'An unexpected error occurred.'}</p>
        <Link href="/dashboard" style={{ color: 'var(--color-primary-light)', textDecoration: 'none' }}>← Back to Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="ambient">
        <div className="ambient-blob" style={{ width: 500, height: 500, background: 'radial-gradient(circle, #6366f1,#4338ca)', top: 0, right: '-15%', opacity: 0.08 }} />
      </div>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,5,15,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
              <Link href="/dashboard" style={{ color: 'var(--color-text-dim)', fontSize: '0.8125rem', textDecoration: 'none', flexShrink: 0 }}>← Dashboard</Link>
              <span style={{ color: 'var(--color-border)' }}>|</span>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>
                  {kit.role?.title || 'Kit'}
                </h1>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', margin: 0 }}>{kit.source?.company || kit.source?.company_url}</p>
              </div>
            </div>
            <Link
              href={`/kit/${id}/practice`}
              className="btn-primary"
              style={{ textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.875rem', flexShrink: 0 }}
            >
              🎴 Practice
            </Link>
          </div>

          {/* Tabs */}
          <nav style={{ display: 'flex', gap: 2, marginTop: '0.75rem', overflowX: 'auto', paddingBottom: '0' }}>
            {TABS.map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0', fontSize: '0.875rem', fontWeight: 500,
                  border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                  background: activeTab === tab ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: activeTab === tab ? '#818cf8' : 'var(--color-text-dim)',
                  borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                }}
              >
                {TAB_ICONS[tab]} {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', position: 'relative', zIndex: 1 }}>
        {activeTab === 'Overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.25rem', alignItems: 'start' }} className="fade-in">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <CompanyBriefSection
                brief={kit.company_brief}
                onPatch={brief => handlePatch({ company_brief: brief })}
                onRegenerate={() => handleRegenerate('company_brief')}
                isRegenerating={generatingSection === 'company_brief'}
              />
              <RoleSection role={kit.role} onPatch={role => handlePatch({ role })} />
            </div>
            <div>
              <CoverageSection coverage={kit.coverage} requirements={kit.role?.requirements} />
            </div>
          </div>
        )}
        {activeTab === 'Questions' && (
          <div className="fade-in">
            <QuestionsSection
              questions={kit.questions || []}
              notes={kit.questionNotes || {}}
              requirements={kit.role?.requirements || []}
              onPatch={(questions, notes) => {
                const payload: any = { questions };
                if (notes) payload.questionNotes = notes;
                return handlePatch(payload);
              }}
              onRegenerate={cat => handleRegenerate('questions', cat)}
              generatingSection={generatingSection}
            />
          </div>
        )}
        {activeTab === 'Flashcards' && (
          <div className="fade-in">
            <FlashcardsSection
              flashcards={kit.flashcards || []}
              onPatch={flashcards => handlePatch({ flashcards })}
              onRegenerate={() => handleRegenerate('flashcards')}
              isRegenerating={generatingSection === 'flashcards'}
            />
          </div>
        )}
        {activeTab === 'Schedule' && (
          <div className="fade-in">
            <ScheduleSection
              schedule={kit.schedule}
              questions={kit.questions || []}
              onRegenerate={() => handleRegenerate('schedule')}
              isRegenerating={generatingSection === 'schedule'}
              onPatch={schedule => handlePatch({ schedule })}
            />
          </div>
        )}
      </main>
    </div>
  );
}
