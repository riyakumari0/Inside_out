import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Check } from 'lucide-react';
import PageShell from '../components/PageShell';
import useToast from '../hooks/useToast';
import { primaryButton } from '../utils/styles';
import { api } from '../api/client';

const fieldClass = 'w-full bg-transparent border-b border-white/50 focus:border-white outline-none py-2 text-sm placeholder-white/50';

// Messages are stored by the API and answered from the Admin Panel's Complaints tab
const ContactPage = () => {
    const { showToast } = useToast();
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.message.trim()) return setError('Please add your name and a message.');
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Please enter a valid email.');
        setError('');
        setIsSending(true);
        try {
            await api('/contact/', { method: 'POST', body: form });
            setSent(true);
            showToast('Message sent. Thank you!');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <PageShell eyebrow="Say hello" title="Contact Us" width="max-w-3xl">
            {sent ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="border border-dashed border-white/50 py-16 px-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-white text-sage-dark flex items-center justify-center mx-auto mb-6">
                        <Check size={28} />
                    </div>
                    <p className="font-script text-3xl mb-2">Thank you, {form.name.split(' ')[0]}!</p>
                    <p className="text-xs uppercase tracking-widest text-white/70">We'll get back to you at {form.email}</p>
                </motion.div>
            ) : (
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
                    <p className="font-script text-2xl text-white/90">Questions, ideas or collabs, we'd love to hear from you.</p>
                    <div className="grid sm:grid-cols-2 gap-8">
                        <label className="block">
                            <span className="block text-xs uppercase tracking-widest text-white/80 mb-2">Name</span>
                            <input type="text" autoComplete="name" value={form.name} onChange={set('name')} className={fieldClass} placeholder="Your name" />
                        </label>
                        <label className="block">
                            <span className="block text-xs uppercase tracking-widest text-white/80 mb-2">Email</span>
                            <input type="email" autoComplete="email" value={form.email} onChange={set('email')} className={fieldClass} placeholder="you@example.com" />
                        </label>
                    </div>
                    <label className="block">
                        <span className="block text-xs uppercase tracking-widest text-white/80 mb-2">Message</span>
                        <textarea rows={5} value={form.message} onChange={set('message')} className={`${fieldClass} resize-y`} placeholder="Tell us anything…" />
                    </label>
                    {error && <p className="text-sm bg-white/90 text-red-600 px-4 py-2" role="alert">{error}</p>}
                    <div className="flex justify-end">
                        <button type="submit" disabled={isSending} className={primaryButton}><Send size={14} /> {isSending ? 'Sending…' : 'Send Message'}</button>
                    </div>
                </form>
            )}
        </PageShell>
    );
};

export default ContactPage;
