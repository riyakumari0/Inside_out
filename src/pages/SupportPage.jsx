import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Send, LifeBuoy, MessageCircleReply } from 'lucide-react';
import PageShell, { Pill } from '../components/PageShell';
import useToast from '../hooks/useToast';
import { primaryButton } from '../utils/styles';
import { api } from '../api/client';

// Keep in sync with ContactMessage.TOPICS in backend/accounts/models.py
const TOPICS = [
    { slug: 'bug', label: 'Something is broken' },
    { slug: 'stylist', label: 'Outfits & stylist' },
    { slug: 'upload', label: 'Uploading pieces' },
    { slug: 'account', label: 'My account' },
    { slug: 'other', label: 'Something else' },
];
const topicLabel = (slug) => TOPICS.find(t => t.slug === slug)?.label ?? 'General message';

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const fieldClass = 'w-full bg-transparent border-b border-white/50 focus:border-white outline-none py-2 text-sm placeholder-white/50';

// Members report a problem here and read the owner's reply
const SupportPage = () => {
    const { showToast } = useToast();
    const [tickets, setTickets] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [topic, setTopic] = useState('bug');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        api('/support/').then(data => setTickets(data.tickets)).catch(err => setLoadError(err.message));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return setError('Tell us what happened.');
        setError('');
        setIsSending(true);
        try {
            const ticket = await api('/support/', { method: 'POST', body: { topic, message: message.trim() } });
            setTickets(prev => [ticket, ...(prev ?? [])]);
            setMessage('');
            showToast("Sent. We'll reply here and by email.");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <PageShell eyebrow="We're here to help" title="Help & Support" width="max-w-4xl">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8 mb-16">
                <p className="font-script text-2xl text-white/90">Facing an issue? Tell us and we'll sort it out.</p>
                <div>
                    <p className="text-xs uppercase tracking-widest text-white/80 mb-4">What's it about?</p>
                    <div className="flex flex-wrap gap-2">
                        {TOPICS.map(t => <Pill key={t.slug} active={topic === t.slug} onClick={() => setTopic(t.slug)}>{t.label}</Pill>)}
                    </div>
                </div>
                <label className="block">
                    <span className="block text-xs uppercase tracking-widest text-white/80 mb-2">What happened?</span>
                    <textarea rows={5} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} className={`${fieldClass} resize-y`} placeholder="What you were doing, what you expected and what went wrong…" />
                </label>
                {error && <p className="text-sm bg-white/90 text-red-600 px-4 py-2" role="alert">{error}</p>}
                <div className="flex justify-end">
                    <button type="submit" disabled={isSending} className={primaryButton}><Send size={14} /> {isSending ? 'Sending…' : 'Send to Support'}</button>
                </div>
            </form>

            <section>
                <h2 className="text-xl font-sans mb-8 uppercase tracking-widest">Your Requests</h2>
                {loadError && <p className="text-sm bg-white/90 text-red-600 px-4 py-2 inline-block" role="alert">{loadError}</p>}
                {tickets && tickets.length === 0 && (
                    <div className="border border-dashed border-white/50 py-14 px-6 text-center">
                        <LifeBuoy size={36} strokeWidth={1.25} className="mx-auto mb-4 text-white/80" />
                        <p className="font-script text-3xl mb-2">No requests yet</p>
                        <p className="text-xs uppercase tracking-widest text-white/70">Anything you send shows up here with our reply</p>
                    </div>
                )}
                {tickets && tickets.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <AnimatePresence initial={false}>
                            {tickets.map(ticket => (
                                <motion.article key={ticket.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white text-charcoal p-5 md:p-6 min-w-0">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <span className="text-[0.65rem] uppercase tracking-widest text-gray-500">{topicLabel(ticket.topic)} · {formatDate(ticket.createdAt)}</span>
                                        <span className={`text-[0.6rem] uppercase tracking-widest px-2 py-1 ${ticket.status === 'resolved' ? 'bg-sage-green text-white' : 'bg-sage-green/15 text-sage-dark'}`}>
                                            {ticket.status === 'resolved' ? 'Resolved' : 'Open'}
                                        </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-line break-words">{ticket.message}</p>
                                    {ticket.reply ? (
                                        <div className="mt-4 border-l-2 border-sage-green bg-off-white px-4 py-3">
                                            <p className="text-[0.65rem] uppercase tracking-widest text-sage-dark mb-1 flex items-center gap-1.5">
                                                <MessageCircleReply size={12} /> Inside & Out replied{ticket.repliedAt ? ` · ${formatDate(ticket.repliedAt)}` : ''}
                                            </p>
                                            <p className="text-sm whitespace-pre-line break-words">{ticket.reply}</p>
                                        </div>
                                    ) : (
                                        <p className="mt-4 text-xs text-gray-400">Waiting for a reply</p>
                                    )}
                                </motion.article>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </section>
        </PageShell>
    );
};

export default SupportPage;
