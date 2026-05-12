import { useState, useRef, useEffect } from 'react';
import { X, HardHat, Image as ImageIcon, Send } from 'lucide-react';

export default function EstimateConsultantChatModal({ open, onClose }) {
    const [messages, setMessages] = useState([
        { text: "Hello! I'm your assigned Estimate Expert. How can I help you today?", isUser: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    const [inputText, setInputText] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const chatBodyRef = useRef(null);
    const replyTimerRef = useRef(null);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    // Clear reply timer on modal close
    useEffect(() => {
        return () => {
            if (replyTimerRef.current) {
                clearTimeout(replyTimerRef.current);
            }
        };
    }, []);

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = () => {
        if (!inputText.trim() && !imagePreview) return;

        const newMsg = {
            text: inputText,
            image: imagePreview,
            isUser: true,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, newMsg]);
        setInputText("");
        setImagePreview(null);

        // Clear any pending reply timer
        if (replyTimerRef.current) {
            clearTimeout(replyTimerRef.current);
        }

        // Simulate reply
        replyTimerRef.current = setTimeout(() => {
            let replyText = "Thanks! I've forwarded this to our senior engineer. He will call you shortly with an estimate.";
            if (newMsg.text.toLowerCase().includes("cost")) replyText = "Costs depend on materials and scope. I'll get an engineer to review this.";
            else if (newMsg.image) replyText = "I've received your image. Analyzing the requirements now.";

            setMessages(prev => [...prev, {
                text: replyText,
                isUser: false,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            replyTimerRef.current = null;
        }, 1500);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white dark:bg-slate-900 w-full max-w-md h-[600px] max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 animate-bounce-in">

                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center border border-gray-200 dark:border-slate-700">
                            <HardHat className="w-6 h-6 text-black dark:text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm dark:text-white">Estimate Expert</h3>
                            <p className="text-xs text-green-600 font-bold flex items-center gap-1"><span className="animate-pulse w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full active:scale-95 transition-transform"><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div ref={chatBodyRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-white dark:bg-slate-900 scroll-smooth">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} animate-bounce-in`} style={{ animationDuration: '0.3s' }}>
                            <div className={`max-w-[80%] rounded-2xl p-3 ${msg.isUser ? 'bg-cyan-500 text-white rounded-tr-sm' : 'bg-gray-100 dark:bg-slate-800 dark:text-white rounded-tl-sm'}`}>
                                {msg.image && <img src={msg.image} className="w-full rounded-lg mb-2 border border-black/10" alt="Uploaded" />}
                                {msg.text && <p className="text-sm">{msg.text}</p>}
                                <span className={`text-[10px] block mt-1 ${msg.isUser ? 'text-cyan-100' : 'text-gray-400'}`}>{msg.time}</span>
                            </div>
                        </div>
                    ))}
                    {messages[messages.length - 1].isUser && (
                        <div className="flex justify-start">
                            <div className="max-w-[80%] rounded-2xl p-3 bg-gray-100 dark:bg-slate-800 rounded-tl-sm text-gray-500 text-sm italic">
                                Typing...
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-2">
                    {imagePreview && (
                        <div className="relative w-20 h-20 mb-2">
                            <img src={imagePreview} className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-slate-700" alt="Preview" />
                            <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:scale-105 active:scale-95 transition-transform">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2 items-center">
                        <input type="file" id="chat-file-input" accept="image/*" className="hidden" onChange={handleImageSelect} />

                        <button onClick={() => document.getElementById('chat-file-input').click()} className="text-gray-400 hover:text-cyan-500 transition-colors p-1 active:scale-95">
                            <ImageIcon className="w-5 h-5" />
                        </button>

                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Ask me anything..."
                            className="flex-1 bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500 dark:text-white"
                            onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage() }}
                        />

                        <button onClick={handleSendMessage} className="bg-cyan-500 text-white p-2 rounded-xl hover:bg-cyan-600 transition-all hover:scale-105 active:scale-95 shadow-md">
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
