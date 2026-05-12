import { useState, useEffect, useRef } from 'react';
import { HelpCircle, MessageCircle, Plus, Send, ArrowLeft, Clock, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { useWorker } from '../WorkerContext';
import { getSupportTickets, createSupportTicket, getTicketMessages, sendTicketMessage } from '../workerSupabase';

interface Ticket {
  id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: number;
  senderId: string;
  senderType: string;
  message: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'payment', label: 'Payment Issues', icon: '💰' },
  { value: 'job', label: 'Job Related', icon: '🔧' },
  { value: 'account', label: 'Account & Profile', icon: '👤' },
  { value: 'technical', label: 'App & Technical', icon: '📱' },
  { value: 'general', label: 'General Inquiry', icon: '❓' },
];

export default function SupportSection() {
  const { showToast, t } = useWorker();
  const [view, setView] = useState<'list' | 'new' | 'chat'>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New ticket form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTickets = async () => {
    try {
      const res = await getSupportTickets();
      setTickets(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      showToast('Please fill all fields', 'error');
      return;
    }
    setSending(true);
    try {
      await createSupportTicket({ subject, message, category });
      showToast('Ticket submitted successfully', 'success');
      setSubject('');
      setCategory('general');
      setMessage('');
      setView('list');
      loadTickets();
    } catch (err) {
      showToast('Failed to create ticket', 'error');
    } finally {
      setSending(false);
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setView('chat');
    try {
      const res = await getTicketMessages(ticket.id);
      setMessages(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    setSending(true);
    try {
      const res = await sendTicketMessage(selectedTicket.id, newMessage);
      const msg = res?.data ?? res;
      if (msg) setMessages(prev => [...prev, msg]);
      setNewMessage('');
    } catch (err) {
      showToast('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'resolved': return '#22c55e';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock size={14} />;
      case 'in_progress': return <AlertCircle size={14} />;
      case 'resolved': return <CheckCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Chat View
  if (view === 'chat' && selectedTicket) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
        {/* Chat Header */}
        <div className="w-glass w-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => { setView('list'); setSelectedTicket(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: 4 }}
            >
              <ArrowLeft size={20} />
            </button>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{selectedTicket.subject}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: getStatusColor(selectedTicket.status),
                  background: `${getStatusColor(selectedTicket.status)}20`,
                  padding: '2px 8px',
                  borderRadius: 12,
                }}>
                  {getStatusIcon(selectedTicket.status)}
                  {selectedTicket.status.replace('_', ' ')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  #{selectedTicket.id}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="w-glass w-card" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.senderType === 'worker' ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: msg.senderType === 'worker' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.senderType === 'worker' ? 'var(--logo-accent)' : 'rgba(255,255,255,0.1)',
                color: msg.senderType === 'worker' ? '#000' : 'var(--text-main)',
              }}>
                <p style={{ margin: 0, fontSize: 14 }}>{msg.message}</p>
                <span style={{
                  fontSize: 10,
                  opacity: 0.7,
                  display: 'block',
                  marginTop: 4,
                  textAlign: 'right',
                }}>
                  {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {selectedTicket.status !== 'closed' && (
          <div className="w-glass w-card" style={{ marginTop: 16, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder={t('type_message')}
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 24,
                  border: '1px solid var(--card-border)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'var(--text-main)',
                  fontSize: 14,
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'var(--logo-accent)',
                  color: '#000',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // New Ticket View
  if (view === 'new') {
    return (
      <div>
        <div className="w-glass w-card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setView('list')}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: 4 }}
            >
              <ArrowLeft size={20} />
            </button>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={20} /> {t('create_new_ticket')}
            </h3>
          </div>
        </div>

        <div className="w-glass w-card">
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Category */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                {t('category_label')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    style={{
                      padding: '12px',
                      borderRadius: 12,
                      border: category === cat.value ? '2px solid var(--logo-accent)' : '1px solid var(--card-border)',
                      background: category === cat.value ? 'rgba(12, 237, 237, 0.1)' : 'transparent',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <span style={{ display: 'block', fontSize: 12, marginTop: 4 }}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                {t('subject_label')}
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder={t('subject_placeholder')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--card-border)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'var(--text-main)',
                  fontSize: 14,
                }}
              />
            </div>

            {/* Message */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                {t('describe_issue')}
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('issue_placeholder')}
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--card-border)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'var(--text-main)',
                  fontSize: 14,
                  resize: 'none',
                }}
              />
            </div>

            <button
              onClick={handleCreateTicket}
              disabled={sending}
              className="w-btn-primary"
              style={{ padding: '14px', fontSize: 15 }}
            >
              {sending ? t('submitting') : t('submit_ticket')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      {/* Header */}
      <div className="w-glass w-card" style={{ marginBottom: 24 }}>
        <div className="w-card-header">
          <div className="w-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HelpCircle size={20} className="icon" />
            {t('support') || 'Support'}
          </div>
          <button
            onClick={() => setView('new')}
            className="w-btn w-btn-success"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '8px 16px' }}
          >
            <Plus size={16} /> {t('new_ticket')}
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="w-glass w-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            {t('loading_tickets')}
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageCircle size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <p>{t('no_tickets')}</p>
            <p style={{ fontSize: 13 }}>{t('ticket_help_msg')}</p>
          </div>
        ) : (
          tickets.map((ticket, idx) => (
            <div
              key={ticket.id}
              onClick={() => openTicket(ticket)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                borderBottom: idx < tickets.length - 1 ? '1px solid var(--card-border)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${getStatusColor(ticket.status)}20`,
                color: getStatusColor(ticket.status),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {getStatusIcon(ticket.status)}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{ticket.subject}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>#{ticket.id}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>•</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(ticket.createdAt)}</span>
                </div>
              </div>
              <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
