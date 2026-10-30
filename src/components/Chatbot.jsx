import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import { api } from '../api/client';

const QUICK_REPLIES = ['Date night', 'Office meeting', 'Weekend brunch', 'Something cozy'];

const Chatbot = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: `Hi ${user?.name?.split(' ')[0] ?? 'lovely'}! I'm your personal AI stylist. Need help finding the perfect look for an event?`, sender: 'bot' }
    ]);
    const [inputText, setInputText] = useState('');
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, isOpen]);

    const toggleChat = () => setIsOpen(!isOpen);

    const send = (text) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { id: Date.now(), text, sender: 'user' }]);
        setInputText('');
        setIsTyping(true);

        // The stylist (Gemini via Django) sees your closet and the last few messages
        const history = messages.slice(-8).map(({ sender, text: t }) => ({ sender, text: t }));
        api('/stylist/chat/', { method: 'POST', body: { message: text, history } })
            .then(reply => setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: reply.text, link: reply.link }]))
            .catch(err => setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: err.message }]))
            .finally(() => setIsTyping(false));
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        send(inputText);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white rounded-2xl shadow-xl border border-gray-100 w-80 md:w-96 max-w-[calc(100vw-3rem)] mb-4 overflow-hidden flex flex-col origin-bottom-right"
                        style={{ height: 'min(500px, calc(100dvh - 7rem))' }}
                    >
                        {/* Header */}
                        <div className="bg-sage-green p-4 flex justify-between items-center text-off-white">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-full">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <h3 className="font-script text-xl">Gen AI Stylist</h3>
                            </div>
                            <button onClick={toggleChat} aria-label="Close chat" className="hover:bg-white/20 p-1 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-off-white/50">
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'user'
                                        ? 'bg-sage-green text-off-white self-end rounded-br-none'
                                        : 'bg-white text-charcoal border border-gray-100 self-start rounded-bl-none shadow-sm'
                                        }`}
                                >
                                    <span className="whitespace-pre-line">{msg.text}</span>
                                    {msg.link && (
                                        <Link to={msg.link.to} onClick={() => setIsOpen(false)} className="block mt-2 text-xs font-bold uppercase tracking-widest text-sage-green hover:text-sage-dark">
                                            {msg.link.label} →
                                        </Link>
                                    )}
                                </motion.div>
                            ))}

                            {isTyping && (
                                <div className="bg-white border border-gray-100 self-start rounded-2xl rounded-bl-none shadow-sm px-4 py-3 flex gap-1" aria-label="Stylist is typing">
                                    {[0, 1, 2].map(i => (
                                        <motion.span
                                            key={i}
                                            className="w-1.5 h-1.5 rounded-full bg-sage-green"
                                            animate={{ y: [0, -4, 0] }}
                                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                        />
                                    ))}
                                </div>
                            )}

                            {messages.length === 1 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {QUICK_REPLIES.map(q => (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => send(q)}
                                            className="text-xs border border-sage-green/40 text-sage-dark rounded-full px-3 py-1 hover:bg-sage-green hover:text-off-white transition-colors"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div ref={endRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Ask for style advice..."
                                aria-label="Message the stylist"
                                className="flex-1 min-w-0 bg-gray-50 border-none rounded-full px-4 text-sm focus:ring-1 focus:ring-sage-green outline-none"
                            />
                            <button
                                type="submit"
                                aria-label="Send"
                                className="p-2 bg-sage-green text-off-white rounded-full hover:bg-sage-green/90 transition-colors disabled:opacity-50"
                                disabled={!inputText.trim()}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleChat}
                aria-label={isOpen ? 'Close stylist chat' : 'Open stylist chat'}
                className="w-14 h-14 bg-sage-green text-off-white rounded-full shadow-lg flex items-center justify-center hover:bg-sage-green/90 transition-colors relative"
            >
                {!isOpen && <span className="absolute inset-0 rounded-full bg-sage-green animate-ping opacity-20" />}
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </motion.button>
        </div>
    );
};

export default Chatbot;
