import React, { useState } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Hi lovely! I'm your personal AI stylist. Need help finding the perfect look for an event?", sender: 'bot' }
    ]);
    const [inputText, setInputText] = useState('');

    const toggleChat = () => setIsOpen(!isOpen);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const newUserMessage = { id: Date.now(), text: inputText, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setInputText('');

        // Mock bot response
        setTimeout(() => {
            const botResponse = {
                id: Date.now() + 1,
                text: "That sounds fabulous! I'd recommend checking out our 'New In' collection for some fresh inspiration that matches that vibe. 🌿",
                sender: 'bot'
            };
            setMessages(prev => [...prev, botResponse]);
        }, 1000);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white rounded-2xl shadow-xl border border-gray-100 w-80 md:w-96 mb-4 overflow-hidden flex flex-col"
                        style={{ maxHeight: '600px', height: '500px' }}
                    >
                        {/* Header */}
                        <div className="bg-sage-green p-4 flex justify-between items-center text-off-white">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-full">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <h3 className="font-script text-xl">Gen AI Stylist</h3>
                            </div>
                            <button onClick={toggleChat} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 bg-off-white/50">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'user'
                                            ? 'bg-sage-green text-off-white self-end rounded-br-none'
                                            : 'bg-white text-charcoal border border-gray-100 self-start rounded-bl-none shadow-sm'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Ask for style advice..."
                                className="flex-1 bg-gray-50 border-none rounded-full px-4 text-sm focus:ring-1 focus:ring-sage-green outline-none"
                            />
                            <button
                                type="submit"
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
                className="w-14 h-14 bg-sage-green text-off-white rounded-full shadow-lg flex items-center justify-center hover:bg-sage-green/90 transition-colors"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </motion.button>
        </div>
    );
};

export default Chatbot;
