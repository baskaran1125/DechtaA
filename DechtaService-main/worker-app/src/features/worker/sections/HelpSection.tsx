import { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, ChevronRight, Search, ThumbsUp, Book, Phone, MessageSquare, Mail, ExternalLink } from 'lucide-react';
import { useWorker } from '../WorkerContext';
import { getFaqs, getFaqCategories, markFaqHelpful, getHelpArticles } from '../workerSupabase';

interface Faq {
  id: number;
  category: string;
  question: string;
  answer: string;
  helpfulCount: number;
}

interface HelpArticle {
  id: number;
  title: string;
  slug: string;
  category: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  account: '👤',
  payments: '💰',
  jobs: '🔧',
  app: '📱',
  safety: '🛡️',
  general: '❓',
};

const CATEGORY_LABELS: Record<string, string> = {
  account: 'Account & Profile',
  payments: 'Payments & Wallet',
  jobs: 'Jobs & Work',
  app: 'App & Technical',
  safety: 'Safety & Security',
  general: 'General',
};

export default function HelpSection() {
  const { state, setState, showToast, t } = useWorker();
  const [loading, setLoading] = useState(true);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [helpfulMarked, setHelpfulMarked] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, [state.language]);

  const loadData = async () => {
    try {
      const [faqData, categoryData, articleData] = await Promise.all([
        getFaqs(undefined, state.language),
        getFaqCategories(),
        getHelpArticles(undefined, state.language),
      ]);
      setFaqs(faqData);
      setCategories(categoryData);
      setArticles(articleData);
    } catch (err) {
      console.error('Failed to load help data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHelpful = async (faqId: number) => {
    if (helpfulMarked.has(faqId)) return;
    try {
      await markFaqHelpful(faqId);
      setHelpfulMarked(prev => new Set(prev).add(faqId));
      setFaqs(prev => prev.map(f => f.id === faqId ? { ...f, helpfulCount: f.helpfulCount + 1 } : f));
      showToast('Thanks for your feedback!', 'success');
    } catch (err) {
      showToast('Failed to submit feedback', 'error');
    }
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    if (!acc[faq.category]) acc[faq.category] = [];
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, Faq[]>);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading help center...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="w-glass w-card" style={{ marginBottom: 24 }}>
        <div className="w-card-header">
          <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={20} className="icon" />
            {t('help_center') || 'Help Center'}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginTop: 16 }}>
          <Search size={18} style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search_help_placeholder')}
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              borderRadius: 12,
              border: '1px solid var(--card-border)',
              background: 'rgba(0,0,0,0.3)',
              color: 'var(--text-main)',
              fontSize: 14,
            }}
          />
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '8px 14px',
              borderRadius: 20,
              border: 'none',
              background: !selectedCategory ? 'var(--logo-accent)' : 'rgba(255,255,255,0.1)',
              color: !selectedCategory ? '#000' : 'var(--text-main)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('filter_all')}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 14px',
                borderRadius: 20,
                border: 'none',
                background: selectedCategory === cat ? 'var(--logo-accent)' : 'rgba(255,255,255,0.1)',
                color: selectedCategory === cat ? '#000' : 'var(--text-main)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{CATEGORY_ICONS[cat] || '❓'}</span>
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-glass w-card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>{t('quick_actions')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <button
            onClick={() => setState(p => ({ ...p, activeSection: 'support' }))}
            style={{
              padding: 16,
              borderRadius: 12,
              border: '1px solid var(--card-border)',
              background: 'transparent',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textAlign: 'left',
            }}
          >
            <MessageSquare size={24} style={{ color: 'var(--logo-accent)' }} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{t('chat_support')}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{t('create_ticket')}</p>
            </div>
          </button>
          <a
            href="tel:1800-XXX-XXXX"
            style={{
              padding: 16,
              borderRadius: 12,
              border: '1px solid var(--card-border)',
              background: 'transparent',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
            }}
          >
            <Phone size={24} style={{ color: '#22c55e' }} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{t('call_us')}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>1800-XXX-XXXX</p>
            </div>
          </a>
        </div>
      </div>

      {/* FAQs */}
      <div className="w-glass w-card">
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
          {t('faq_title')}
        </h3>

        {filteredFaqs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <HelpCircle size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>{t('no_faqs')}</p>
            {searchQuery && <p style={{ fontSize: 13 }}>{t('diff_search_term')}</p>}
          </div>
        ) : (
          Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
            <div key={category} style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '1px solid var(--card-border)',
              }}>
                <span style={{ fontSize: 18 }}>{CATEGORY_ICONS[category] || '❓'}</span>
                <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
                  {CATEGORY_LABELS[category] || category}
                </h4>
              </div>

              {categoryFaqs.map(faq => (
                <div
                  key={faq.id}
                  style={{
                    marginBottom: 8,
                    borderRadius: 12,
                    border: '1px solid var(--card-border)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    style={{
                      width: '100%',
                      padding: 16,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{faq.question}</span>
                    {expandedFaq === faq.id ? (
                      <ChevronDown size={20} style={{ flexShrink: 0 }} />
                    ) : (
                      <ChevronRight size={20} style={{ flexShrink: 0 }} />
                    )}
                  </button>

                  {expandedFaq === faq.id && (
                    <div style={{
                      padding: '0 16px 16px',
                      borderTop: '1px solid var(--card-border)',
                    }}>
                      <p style={{
                        margin: '16px 0',
                        fontSize: 14,
                        color: 'var(--text-muted)',
                        lineHeight: 1.6,
                      }}>
                        {faq.answer}
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 12,
                        borderTop: '1px solid var(--card-border)',
                      }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {t('was_helpful')}
                        </span>
                        <button
                          onClick={() => handleMarkHelpful(faq.id)}
                          disabled={helpfulMarked.has(faq.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 20,
                            border: 'none',
                            background: helpfulMarked.has(faq.id) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.1)',
                            color: helpfulMarked.has(faq.id) ? '#22c55e' : 'var(--text-main)',
                            cursor: helpfulMarked.has(faq.id) ? 'default' : 'pointer',
                            fontSize: 12,
                          }}
                        >
                          <ThumbsUp size={14} />
                          {helpfulMarked.has(faq.id) ? t('thanks_feedback') : `Yes (${faq.helpfulCount})`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Help Articles */}
      {articles.length > 0 && (
        <div className="w-glass w-card" style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Book size={18} /> {t('help_articles')}
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {articles.slice(0, 5).map(article => (
              <a
                key={article.id}
                href={`#/help/${article.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-main)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 14 }}>{article.title}</span>
                <ExternalLink size={16} style={{ color: 'var(--text-muted)' }} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
