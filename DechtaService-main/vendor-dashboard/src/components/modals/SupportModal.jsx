import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Icons } from '../ui/Icons';
import { createTicket } from '../../api/apiClient';
import { onMessagesChange, vendorSend } from '../../utils/demoSupportService';

/* ─────────────────────────────────────────────────────────────
   DEMO SUPPORT CHAT
   Floating chat widget — top-right corner of the modal.
   Shows notification dot when admin replies.
   Clicking the bubble opens the WhatsApp-style chat window.
───────────────────────────────────────────────────────────── */
const DemoChat = () => {
  const [open,        setOpen]        = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [hasNew,      setHasNew]      = useState(false);
  const [notifBanner, setNotifBanner] = useState(null); // { text }
  const [isTyping,    setIsTyping]    = useState(false);
  const bottomRef    = useRef(null);
  const prevCountRef = useRef(0);

  // Subscribe to message changes
  useEffect(() => {
    const unsub = onMessagesChange((msgs) => {
      setMessages(msgs);

      const lastMsg = msgs[msgs.length - 1];
      if (msgs.length > prevCountRef.current && lastMsg?.sender === 'admin') {
        setHasNew(true);
        setIsTyping(false);
        // Show floating notification banner when chat is closed
        if (!open) {
          setNotifBanner({ text: `Admin replied: ${lastMsg.text}` });
          setTimeout(() => setNotifBanner(null), 5000);
        }
      }
      prevCountRef.current = msgs.length;
    });
    return unsub;
  }, [open]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = () => {
    if (!input.trim()) return;
    vendorSend(input.trim());
    setInput('');
    setIsTyping(true);                            // admin "typing" indicator
    setTimeout(() => setIsTyping(false), 2200);  // clears after admin reply
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const openChat = () => { setOpen(true); setHasNew(false); setNotifBanner(null); };

  return (
    <>
      {/* ── Notification banner ── */}
      {notifBanner && !open && (
        <div
          onClick={openChat}
          className="fixed top-4 right-4 z-[500] max-w-xs bg-[#075E54] text-white text-xs font-medium px-4 py-3 rounded-2xl shadow-2xl cursor-pointer fade-in flex items-start gap-2"
          style={{ animation: 'fadeIn 0.3s ease' }}
        >
          <span className="text-base shrink-0">💬</span>
          <div>
            <div className="font-bold text-[10px] uppercase tracking-wide text-green-200 mb-0.5">Support</div>
            <div className="leading-snug">{notifBanner.text}</div>
            <div className="text-[10px] text-green-200 mt-1">Tap to open chat →</div>
          </div>
        </div>
      )}

      {/* ── Floating chat bubble — top-right corner ── */}
      <div className="absolute top-3 right-12 z-[400]">
        <button
          onClick={open ? () => setOpen(false) : openChat}
          title="Support Chat"
          className="relative w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#20b958] shadow-lg flex items-center justify-center transition active:scale-90 hover:scale-110"
        >
          {/* chat bubble icon */}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {/* unread dot */}
          {hasNew && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
          )}
        </button>
      </div>

      {/* ── Chat window — slides in from top-right ── */}
      {open && ReactDOM.createPortal(
        <div className="fixed top-20 right-4 z-[600] w-80 shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 fade-in flex flex-col"
          style={{ maxHeight: '480px' }}>

          {/* Header */}
          <div className="bg-[#075E54] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm">🛠</div>
              <div>
                <div className="text-white font-bold text-xs leading-none">Support Chat</div>
                <div className="text-green-200 text-[10px] mt-0.5">
                  {isTyping ? 'Admin is typing…' : 'Admin • Online'}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition p-1 rounded-full text-sm">✕</button>
          </div>

          {/* Chat area */}
          <div className="flex-1 overflow-y-auto bg-[#ECE5DD] dark:bg-slate-800 p-3 space-y-2"
            style={{ minHeight: '280px', maxHeight: '340px' }}>

            {messages.length === 0 && (
              <div className="text-center text-[11px] text-gray-500 dark:text-gray-400 py-8">
                👋 Send a message to start chatting with Admin
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'vendor' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs shadow-sm
                  ${msg.sender === 'vendor'
                    ? 'bg-[#DCF8C6] text-gray-800 rounded-br-sm'
                    : 'bg-white dark:bg-slate-700 dark:text-white text-gray-800 rounded-bl-sm'}`}>
                  <p className="leading-snug">{msg.text}</p>
                  <p className={`text-[9px] mt-1 text-right ${msg.sender === 'vendor' ? 'text-green-700' : 'text-gray-400'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-700 px-3 py-2 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="bg-white dark:bg-slate-900 px-3 py-2 flex items-center gap-2 shrink-0 border-t border-gray-100 dark:border-slate-700">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 text-xs bg-gray-50 dark:bg-slate-800 dark:text-white rounded-full px-3 py-2 outline-none border border-transparent focus:border-[#25D366] transition"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-[#25D366] disabled:opacity-40 hover:bg-[#20b958] flex items-center justify-center transition active:scale-90 shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   EXISTING SUPPORT MODAL — kept exactly as-is
   + DemoChat widget added in top-right corner of modal header
───────────────────────────────────────────────────────────── */
export const SupportModal = ({ onClose, notify }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return notify('Please enter a message', 'error');
    setLoading(true);
    try {
      await createTicket({ subject, message });
      notify('Ticket Raised Successfully!', 'success');
      onClose();
    } catch { notify('Failed to raise ticket', 'error'); }
    finally   { setLoading(false); }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 modal-slide-up relative">

        {/* Header — DemoChat bubble sits in top-right of this header */}
        <div className="bg-[#0ceded] p-4 flex justify-between items-center shadow-md relative">
          <div className="flex items-center gap-2 text-black">
            <div className="bg-black text-[#0ceded] p-1 rounded-lg"><Icons.Tool /></div>
            <span className="font-black text-sm uppercase tracking-tighter">Support Desk</span>
          </div>

          {/* Demo chat bubble — top right of the header bar */}
          <DemoChat />

          <button onClick={onClose} className="text-black hover:rotate-90 transition p-1 ml-2">✕</button>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 text-[10px] text-gray-500 font-bold uppercase tracking-widest border-b dark:border-slate-700">
          Raise a Ticket to Admin
        </div>

        {/* Existing ticket form — unchanged */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Subject</label>
            <input type="text" placeholder="e.g., Payment issue, Dashboard bug"
              value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-[#0ceded] outline-none text-sm dark:text-white" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Message</label>
            <textarea rows="4" placeholder="Describe your issue in detail..."
              value={message} onChange={e => setMessage(e.target.value)}
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-[#0ceded] outline-none text-sm dark:text-white resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-black dark:bg-white dark:text-black text-white font-bold py-3.5 rounded-xl shadow-lg hover:scale-[1.02] active:scale-95 transition">
            {loading ? 'Sending...' : 'Send to Admin'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};