import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { sendVendorQuery } from '../../api/apiClient';
import {
  createTicket, loadMessages, saveMessage,
  isLimitReached, getTodayCount, nowTime, DAILY_LIMIT, getResetTime,
} from '../../support/ticketService';

const DAILY_LIMIT_NUM = 3;

// ── Admin reply simulation ────────────────────────────────────
const ADMIN_REPLIES = [
  'Yes, what help do you need?',
  'Sure! Could you provide more details?',
  'I can help with that. Please share the product name.',
  'Got it! Let me check and get back to you shortly.',
  'Understood. Our team will resolve this within 24 hours.',
  'Thank you for reaching out. Can you share an order ID?',
  'I see the issue. Please allow me 5 minutes to look into this.',
  'Noted! I have escalated this to the concerned team.',
];

const ISSUE_TYPES = [
  'Product Approval',
  'Price Issue',
  'Delivery Problem',
  'Payment Issue',
  'Account Issue',
  'Order Dispute',
  'Technical Bug',
  'Other',
];

// ── Voice recorder hook ───────────────────────────────────────
const useVoiceRecorder = (notify) => {
  const [recording,  setRecording]  = useState(false);
  const [audioBlob,  setAudioBlob]  = useState(null);
  const [audioURL,   setAudioURL]   = useState(null);
  const [recSeconds, setRecSeconds] = useState(0);
  const mrRef    = useRef(null);
  const chunks   = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch { notify('Microphone access denied.', 'error'); }
  };

  const stop = () => {
    if (mrRef.current && mrRef.current.state !== 'inactive') mrRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const clear = () => { setAudioBlob(null); setAudioURL(null); setRecSeconds(0); };

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return { recording, audioBlob, audioURL, recSeconds, start, stop, clear, fmt };
};

// ── Voice bubble component ────────────────────────────────────
const VoiceBubble = ({ url, sender }) => (
  <div className={`flex ${sender === 'vendor' ? 'justify-end' : 'justify-start'} mt-1`}>
    <div className={`max-w-[80%] px-3 py-2 rounded-2xl shadow-sm
      ${sender === 'vendor'
        ? 'bg-[#DCF8C6] text-gray-800 rounded-br-sm'
        : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white rounded-bl-sm'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">🎤</span>
        <audio src={url} controls className="h-7 w-40" />
      </div>
      <p className="text-[9px] text-gray-400 mt-0.5 text-right">Voice message</p>
    </div>
  </div>
);

// ── Chat message bubble ───────────────────────────────────────
const MsgBubble = ({ msg }) => {
  const isVendor = msg.sender === 'vendor';
  if (msg.type === 'voice') return <VoiceBubble url={msg.audioURL} sender={msg.sender} />;
  if (msg.type === 'ticket') return (
    <div className="flex justify-center my-2">
      <div className="bg-[#075E54] text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow">
        🎫 Ticket #{msg.ticketId} Created
      </div>
    </div>
  );
  return (
    <div className={`flex ${isVendor ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-xs shadow-sm
        ${isVendor
          ? 'bg-[#DCF8C6] text-gray-800 rounded-br-sm'
          : 'bg-white dark:bg-slate-700 dark:text-white text-gray-800 rounded-bl-sm'}`}>
        <p className="leading-snug">{msg.text}</p>
        <p className={`text-[9px] mt-1 text-right ${isVendor ? 'text-green-700' : 'text-gray-400'}`}>{msg.time}</p>
      </div>
    </div>
  );
};

// ── Ticket Form ───────────────────────────────────────────────
const TicketForm = ({ onCreated, onCancel, notify, voice }) => {
  const [issueType,    setIssueType]    = useState('');
  const [subject,      setSubject]      = useState('');
  const [description,  setDescription]  = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!issueType) return notify('Please select an issue type', 'error');
    if (!subject.trim()) return notify('Please enter a subject', 'error');

    if (isLimitReached()) {
      const reset = getResetTime();
      const resetStr = reset
        ? reset.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '24 hours';
      return notify(`You have reached the ticket limit (${DAILY_LIMIT_NUM}). Try again after ${resetStr}.`, 'error');
    }

    setSubmitting(true);
    const { ticket, error } = createTicket({ issueType, subject, description });

    if (error === 'limit') {
      const reset = getResetTime();
      const resetStr = reset
        ? reset.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '24 hours';
      notify(`Ticket limit reached (${DAILY_LIMIT_NUM}/24h). Try again after ${resetStr}.`, 'error');
      setSubmitting(false);
      return;
    }

    setTimeout(() => {
      setSubmitting(false);
      onCreated(ticket);
    }, 400);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      {/* 24h rolling limit indicator */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
        <span>Tickets (last 24h): {getTodayCount()} / {DAILY_LIMIT_NUM}</span>
        {isLimitReached() && (() => {
          const reset = getResetTime();
          const resetStr = reset
            ? reset.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : '24h';
          return <span className="text-red-400 font-bold">Resets at {resetStr}</span>;
        })()}
      </div>

      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Issue Type *</label>
        <select value={issueType} onChange={e => setIssueType(e.target.value)}
          className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-[#075E54] outline-none text-sm dark:text-white">
          <option value="">Select issue type...</option>
          {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Subject *</label>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
          placeholder="Brief summary of your issue"
          className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-[#075E54] outline-none text-sm dark:text-white" />
      </div>

      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Description</label>
        <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describe your issue in detail..."
          className="w-full p-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-[#075E54] outline-none text-sm dark:text-white resize-none" />
      </div>

      {/* Voice note preview if recorded */}
      {voice.audioURL && (
        <div className="bg-[#ECE5DD] dark:bg-slate-800 rounded-xl p-2 flex items-center gap-2">
          <span className="text-xs">🎤</span>
          <audio src={voice.audioURL} controls className="h-7 flex-1" />
          <button type="button" onClick={voice.clear} className="text-red-400 text-xs font-bold">✕</button>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
          Cancel
        </button>
        <button type="submit" disabled={submitting || isLimitReached()}
          className="flex-1 py-2.5 rounded-xl bg-[#075E54] hover:bg-[#064d44] disabled:opacity-50 text-white text-xs font-bold transition active:scale-95">
          {submitting ? 'Creating...' : 'Create Ticket'}
        </button>
      </div>
    </form>
  );
};

// ── Main VendorQueryModal ─────────────────────────────────────
export const VendorQueryModal = ({ onClose, notify }) => {
  const [view,       setView]       = useState('chat');  // 'chat' | 'ticket'
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [isTyping,   setIsTyping]   = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const bottomRef = useRef(null);
  const voice     = useVoiceRecorder(notify);

  // Load persisted messages on mount
  useEffect(() => {
    const stored = activeTicket
      ? loadMessages(activeTicket.id)
      : JSON.parse(sessionStorage.getItem('dechta_query_msgs') || '[]');
    setMessages(stored);
  }, [activeTicket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const persistMsg = (msg) => {
    if (activeTicket) {
      saveMessage(activeTicket.id, msg);
    } else {
      const stored = JSON.parse(sessionStorage.getItem('dechta_query_msgs') || '[]');
      stored.push(msg);
      sessionStorage.setItem('dechta_query_msgs', JSON.stringify(stored));
    }
  };

  const addMsg = (msg) => {
    setMessages(prev => [...prev, msg]);
    persistMsg(msg);
  };

  const scheduleAdminReply = () => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const reply = ADMIN_REPLIES[Math.floor(Math.random() * ADMIN_REPLIES.length)];
      const msg = { id: Date.now(), sender: 'admin', type: 'text', text: reply, time: nowTime() };
      addMsg(msg);
    }, 2000);
  };

  const handleSendText = async () => {
    if (!input.trim() && !voice.audioURL) return;

    if (input.trim()) {
      const msg = { id: Date.now(), sender: 'vendor', type: 'text', text: input.trim(), time: nowTime() };
      addMsg(msg);
      setInput('');
    }

    if (voice.audioURL && voice.audioBlob) {
      const msg = { id: Date.now() + 1, sender: 'vendor', type: 'voice', audioURL: voice.audioURL, time: nowTime() };
      addMsg(msg);
      // Also persist as 🎤 text marker for reload
      const markerMsg = { id: Date.now() + 2, sender: 'vendor', type: 'text', text: '🎤 Voice message sent', time: nowTime() };
      persistMsg(markerMsg);
      voice.clear();
    }

    // Also send to backend (best effort)
    try {
      setLoading(true);
      await sendVendorQuery({ message: input.trim() || '🎤 Voice message' });
    } catch { /* demo mode — ignore API errors */ }
    finally { setLoading(false); }

    scheduleAdminReply();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }
  };

  const handleTicketCreated = (ticket) => {
    setActiveTicket(ticket);
    setView('chat');
    const ticketMsg = { id: Date.now(), sender: 'system', type: 'ticket', ticketId: ticket.id, time: nowTime() };
    addMsg(ticketMsg);
    // Auto admin reply for ticket
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const msg = { id: Date.now(), sender: 'admin', type: 'text',
          text: `Ticket ${ticket.id} received! Issue: "${ticket.issueType}". How can I help you further?`, time: nowTime() };
        addMsg(msg);
      }, 2000);
    }, 500);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-end p-4 pointer-events-none">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={onClose} />

      <div className="relative pointer-events-auto w-full max-w-sm modal-slide-up flex flex-col"
        style={{ height: '580px', maxHeight: '90vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between bg-[#075E54] rounded-t-2xl px-4 py-3 shadow-lg shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
                <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-none">Query Admin</div>
              <div className="text-green-200 text-[10px] mt-0.5">
                {activeTicket ? `Ticket #${activeTicket.id}` : 'Admin Support • Vendor Only'}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white hover:rotate-90 transition p-1 rounded-full">✕</button>
        </div>

        {/* ── Ticket ID banner (when ticket active) ── */}
        {activeTicket && (
          <div className="bg-[#128C7E] px-4 py-1.5 text-center text-[10px] text-white font-bold shrink-0">
            🎫 Ticket #{activeTicket.id} — {activeTicket.issueType}
          </div>
        )}

        {/* ── Notice bar ── */}
        {view === 'chat' && (
          <div className="bg-[#ECE5DD] dark:bg-slate-800 px-4 py-1.5 text-[10px] text-gray-500 dark:text-gray-400 text-center font-medium shrink-0">
            🔒 This query goes only to Admin — not visible to customers
          </div>
        )}

        {/* ── Ticket form or Chat ── */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 flex flex-col">

          {view === 'ticket' ? (
            <div className="flex-1 overflow-y-auto">
              <div className="bg-[#ECE5DD] dark:bg-slate-800 px-4 py-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest border-b dark:border-slate-700">
                Raise Support Ticket
              </div>
              <TicketForm
                onCreated={handleTicketCreated}
                onCancel={() => setView('chat')}
                notify={notify}
                voice={voice}
              />
            </div>
          ) : (
            <>
              {/* Chat messages area */}
              <div className="flex-1 overflow-y-auto bg-[#ECE5DD] dark:bg-slate-800 p-3 space-y-2">
                {messages.length === 0 && (
                  <div className="text-center text-[11px] text-gray-500 dark:text-gray-400 py-8">
                    👋 Send a message or raise a support ticket
                  </div>
                )}
                {messages.map(msg => <MsgBubble key={msg.id} msg={msg} />)}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-700 px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                      {[0,1,2].map(i => (
                        <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Voice preview */}
              {voice.audioURL && (
                <div className="bg-[#ECE5DD] dark:bg-slate-800 px-3 py-2 flex items-center gap-2 border-t border-gray-200 dark:border-slate-700 shrink-0">
                  <span className="text-xs">🎤</span>
                  <audio src={voice.audioURL} controls className="h-7 flex-1" />
                  <button onClick={voice.clear} className="text-red-400 text-xs font-bold">✕</button>
                </div>
              )}

              {/* Input bar */}
              <div className="bg-white dark:bg-slate-900 px-3 py-2 border-t border-gray-100 dark:border-slate-700 shrink-0">
                {/* Raise Ticket button */}
                <button type="button" onClick={() => setView('ticket')}
                  className="w-full mb-2 py-1.5 rounded-xl border border-[#075E54] text-[#075E54] dark:text-green-400 text-xs font-bold hover:bg-[#075E54]/5 transition flex items-center justify-center gap-1.5">
                  <span>🎫</span> Raise Support Ticket
                  <span className="text-[9px] text-gray-400 ml-1">({getTodayCount()}/{DAILY_LIMIT_NUM} per 24h)</span>
                </button>

                <div className="flex items-center gap-2">
                  {/* Voice record button */}
                  {!voice.recording ? (
                    <button type="button" onClick={voice.start}
                      className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 hover:bg-[#075E54] hover:text-white transition shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    </button>
                  ) : (
                    <button type="button" onClick={voice.stop}
                      className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white animate-pulse shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                      </svg>
                    </button>
                  )}
                  {voice.recording && (
                    <span className="text-[10px] text-red-500 font-bold tabular-nums shrink-0">{voice.fmt(voice.recSeconds)}</span>
                  )}

                  <input type="text" value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 text-xs bg-gray-50 dark:bg-slate-800 dark:text-white rounded-full px-3 py-2 outline-none border border-transparent focus:border-[#25D366] transition" />

                  <button type="button" onClick={handleSendText}
                    disabled={!input.trim() && !voice.audioURL || loading}
                    className="w-8 h-8 rounded-full bg-[#25D366] disabled:opacity-40 hover:bg-[#20b958] flex items-center justify-center transition active:scale-90 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Rounded bottom ── */}
        <div className="bg-white dark:bg-slate-900 h-2 rounded-b-2xl shrink-0" />
      </div>
    </div>,
    document.body
  );
};