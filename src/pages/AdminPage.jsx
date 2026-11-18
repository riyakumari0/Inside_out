import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Shirt, Sparkles, Mail, Search, ShieldCheck, ShieldOff, UserX, UserCheck, Trash2, RefreshCw, Activity, CheckCircle2, RotateCcw, Send } from 'lucide-react';
import PageShell, { Pill } from '../components/PageShell';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import { api } from '../api/client';
import { ghostButton } from '../utils/styles';

const TABS = [
    { slug: 'overview', label: 'Overview' },
    { slug: 'users', label: 'Users' },
    { slug: 'complaints', label: 'Complaints' },
];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never');

const Spinner = () => (
    <motion.span
        className="inline-block w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
);

const Empty = ({ icon: Icon, title, text }) => (
    <div className="border border-dashed border-white/50 py-16 px-6 text-center">
        <Icon size={36} strokeWidth={1.25} className="mx-auto mb-4 text-white/80" />
        <p className="font-script text-3xl mb-2">{title}</p>
        <p className="text-xs uppercase tracking-widest text-white/70">{text}</p>
    </div>
);

// Loads one admin endpoint and lets the tab refresh it after a change
const useAdminData = (path) => {
    const [state, setState] = useState({ data: null, error: '', loading: true });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        api(path)
            .then(data => !cancelled && setState({ data, error: '', loading: false }))
            .catch(err => !cancelled && setState({ data: null, error: err.message, loading: false }));
        return () => { cancelled = true; };
    }, [path, attempt]);

    const reload = useCallback(() => {
        setState(s => ({ ...s, loading: true }));
        setAttempt(a => a + 1);
    }, []);
    return { ...state, reload, setData: (fn) => setState(s => ({ ...s, data: fn(s.data) })) };
};

const Status = ({ loading, error, onRetry }) => {
    if (loading) return <div className="py-16 flex justify-center"><Spinner /></div>;
    if (error) {
        return (
            <div className="py-10 text-center">
                <p className="text-sm bg-white/90 text-red-600 px-4 py-2 inline-block mb-4" role="alert">{error}</p>
                <div><button type="button" onClick={onRetry} className={ghostButton}><RefreshCw size={14} /> Try again</button></div>
            </div>
        );
    }
    return null;
};

// ---------- Overview ----------

const StatTile = ({ icon: Icon, label, value, sub, index, to }) => {
    const body = (
        <>
            <span className="flex items-center gap-2 text-[0.65rem] uppercase tracking-widest text-gray-500"><Icon size={14} /> {label}</span>
            <span className="text-4xl font-medium">{value}</span>
            {sub && <span className="text-[0.65rem] uppercase tracking-widest text-sage-dark truncate">{sub}</span>}
        </>
    );
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="min-w-0">
            {to ? (
                <Link to={`/admin-panel?tab=${to}`} className="bg-white text-charcoal p-5 flex flex-col gap-2 h-full hover:ring-2 hover:ring-white/60 transition">{body}</Link>
            ) : (
                <div className="bg-white text-charcoal p-5 flex flex-col gap-2 h-full">{body}</div>
            )}
        </motion.div>
    );
};

const Bars = ({ title, rows, empty }) => {
    const max = Math.max(1, ...rows.map(r => r.count));
    return (
        <div className="border border-white/20 bg-sage-dark/40 p-5 md:p-6 min-w-0">
            <h3 className="text-xs uppercase tracking-widest mb-5">{title}</h3>
            {rows.length === 0 ? <p className="text-xs text-white/70">{empty}</p> : (
                <ul className="space-y-3">
                    {rows.map(row => (
                        <li key={row.label}>
                            <div className="flex justify-between text-xs uppercase tracking-widest mb-1.5">
                                <span className="truncate pr-3">{row.label}</span><span>{row.count}</span>
                            </div>
                            <div className="h-1 bg-white/20">
                                <motion.div className="h-full bg-white" initial={{ width: 0 }} animate={{ width: `${(row.count / max) * 100}%` }} transition={{ duration: 0.8 }} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const Overview = () => {
    const { data, loading, error, reload } = useAdminData('/admin-panel/stats/');
    if (!data) return <Status loading={loading} error={error} onRetry={reload} />;

    const tiles = [
        { icon: Users, label: 'Members', value: data.users, sub: `+${data.newUsersThisWeek} joined this week` },
        { icon: Activity, label: 'Active this week', value: data.activeThisWeek, sub: `${data.activeToday} in the last 24 hours` },
        { icon: Mail, label: 'Open complaints', value: data.openComplaints, sub: `${data.messages} messages in total`, to: 'complaints' },
        { icon: Sparkles, label: 'Looks created', value: data.looks, sub: `+${data.looksThisWeek} this week` },
        { icon: Shirt, label: 'Pieces uploaded', value: data.items, sub: data.users ? `${(data.items / data.users).toFixed(1)} per member` : '' },
        { icon: Users, label: 'Accounts active', value: data.activeUsers, sub: `${data.users - data.activeUsers} deactivated` },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {tiles.map((tile, i) => <StatTile key={tile.label} index={i} {...tile} />)}
            </div>

            <div className="flex flex-wrap gap-2 text-[0.6rem] uppercase tracking-widest">
                <span className={`px-2 py-1 ${data.services.gemini ? 'bg-white text-sage-dark' : 'bg-white/20'}`}>Gemini {data.services.gemini ? 'on' : 'off'}</span>
                <span className={`px-2 py-1 ${data.services.shopping ? 'bg-white text-sage-dark' : 'bg-white/20'}`}>Shopping {data.services.shopping ? 'on' : 'off'}</span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Bars
                    title="Wardrobe by category"
                    rows={data.itemsByCategory.map(r => ({ label: r.category, count: r.count }))}
                    empty="No pieces yet."
                />
                <Bars
                    title="Most styled occasions"
                    rows={data.looksByVibe.map(r => ({ label: r.label, count: r.count }))}
                    empty="No saved looks yet."
                />
            </div>

            <div className="border border-white/20 bg-sage-dark/40 p-5 md:p-6">
                <h3 className="text-xs uppercase tracking-widest mb-5">Latest looks</h3>
                {data.recentLooks.length === 0 ? <p className="text-xs text-white/70">No saved looks yet.</p> : (
                    <ul className="divide-y divide-white/15">
                        {data.recentLooks.map((look, i) => (
                            <li key={i} className="py-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                <div className="min-w-0">
                                    <p className="font-script text-2xl leading-tight truncate">{look.name}</p>
                                    <p className="text-[0.65rem] uppercase tracking-widest text-white/70 break-words">
                                        {look.event || look.vibe || 'Everyday'} · by {look.owner}
                                    </p>
                                </div>
                                <span className="text-[0.65rem] uppercase tracking-widest text-white/70">{formatDate(look.createdAt)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

// ---------- Users ----------

const Badge = ({ children, tone = 'sage' }) => (
    <span className={`text-[0.55rem] uppercase tracking-widest px-1.5 py-0.5 ${tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-sage-green/15 text-sage-dark'}`}>{children}</span>
);

const rowButton = 'inline-flex items-center gap-1.5 border border-gray-200 px-3 py-2 text-[0.6rem] uppercase tracking-widest hover:border-charcoal transition disabled:opacity-40';

const UserRow = ({ person, isSelf, onUpdate, onDelete, busy }) => (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-sage-green text-off-white flex items-center justify-center text-sm font-bold uppercase">
                {person.avatar ? <img src={person.avatar} alt="" className="w-full h-full object-cover" /> : person.name.trim().charAt(0)}
            </span>
            <div className="min-w-0">
                <p className="text-sm font-bold truncate flex items-center gap-2 flex-wrap">
                    {person.name}
                    {person.isAdmin && <Badge>Admin</Badge>}
                    {!person.isActive && <Badge tone="red">Deactivated</Badge>}
                    {isSelf && <Badge>You</Badge>}
                </p>
                <p className="text-xs text-gray-500 truncate">{person.email}</p>
            </div>
        </div>

        <dl className="grid grid-cols-4 gap-3 text-[0.6rem] uppercase tracking-widest text-gray-500 lg:w-96 shrink-0">
            <div><dt>Pieces</dt><dd className="text-charcoal text-sm normal-case tracking-normal">{person.items}</dd></div>
            <div><dt>Looks</dt><dd className="text-charcoal text-sm normal-case tracking-normal">{person.looks}</dd></div>
            <div><dt>Joined</dt><dd className="text-charcoal text-xs normal-case tracking-normal">{formatDate(person.joined)}</dd></div>
            <div><dt>Last seen</dt><dd className="text-charcoal text-xs normal-case tracking-normal">{formatDate(person.lastSeen)}</dd></div>
        </dl>

        {!isSelf && (
            <div className="flex flex-wrap gap-2 shrink-0">
                <button type="button" disabled={busy} onClick={() => onUpdate({ isAdmin: !person.isAdmin })} className={rowButton}>
                    {person.isAdmin ? <><ShieldOff size={12} /> Remove admin</> : <><ShieldCheck size={12} /> Make admin</>}
                </button>
                <button type="button" disabled={busy} onClick={() => onUpdate({ isActive: !person.isActive })} className={rowButton}>
                    {person.isActive ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Reactivate</>}
                </button>
                <button type="button" disabled={busy} onClick={onDelete} aria-label={`Delete ${person.email}`} className={`${rowButton} hover:border-red-500 hover:text-red-500`}>
                    <Trash2 size={12} /> Delete
                </button>
            </div>
        )}
    </motion.li>
);

const UsersTab = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [busyId, setBusyId] = useState(null);
    const { data, loading, error, reload, setData } = useAdminData(`/admin-panel/users/${search ? `?q=${encodeURIComponent(search)}` : ''}`);

    // Search as you type, after a short pause
    useEffect(() => {
        const timer = setTimeout(() => setSearch(query.trim()), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const update = async (person, fields) => {
        setBusyId(person.id);
        try {
            const result = await api(`/admin-panel/users/${person.id}/`, { method: 'PATCH', body: fields });
            setData(d => ({ users: d.users.map(u => (u.id === person.id ? result.user : u)) }));
            showToast(`${person.name} updated`);
        } catch (err) {
            showToast(err.message);
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (person) => {
        if (!window.confirm(`Delete ${person.email}? Their closet, looks, bag and photos are removed for good.`)) return;
        setBusyId(person.id);
        try {
            await api(`/admin-panel/users/${person.id}/`, { method: 'DELETE' });
            setData(d => ({ users: d.users.filter(u => u.id !== person.id) }));
            showToast('Account deleted');
        } catch (err) {
            showToast(err.message);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            <div className="relative max-w-md mb-6">
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or email"
                    aria-label="Search members"
                    className="w-full bg-transparent border border-white/40 focus:border-white text-white placeholder-white/50 pl-10 pr-4 py-3 text-sm focus:outline-none transition"
                />
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
            </div>

            {!data ? <Status loading={loading} error={error} onRetry={reload} /> : data.users.length === 0 ? (
                <Empty icon={Users} title="No members found" text={search ? 'Try another name or email' : 'Nobody has signed up yet'} />
            ) : (
                <>
                    <p className="text-xs uppercase tracking-widest text-white/70 mb-3">{data.users.length} member{data.users.length === 1 ? '' : 's'}</p>
                    <ul className="bg-white text-charcoal divide-y divide-gray-100">
                        <AnimatePresence initial={false}>
                            {data.users.map(person => (
                                <UserRow
                                    key={person.id}
                                    person={person}
                                    isSelf={person.email === user.email}
                                    busy={busyId === person.id}
                                    onUpdate={(fields) => update(person, fields)}
                                    onDelete={() => remove(person)}
                                />
                            ))}
                        </AnimatePresence>
                    </ul>
                </>
            )}
        </div>
    );
};

// ---------- Complaints ----------

const FILTERS = [
    { slug: 'open', label: 'Open' },
    { slug: 'resolved', label: 'Resolved' },
    { slug: '', label: 'All' },
];

const Complaint = ({ message, onChange, onDelete }) => {
    const { showToast } = useToast();
    const [reply, setReply] = useState(message.reply);
    const [busy, setBusy] = useState(false);

    const save = async (fields, done) => {
        setBusy(true);
        try {
            const result = await api(`/admin-panel/messages/${message.id}/`, { method: 'PATCH', body: fields });
            onChange(result.message);
            showToast(done);
        } catch (err) {
            showToast(err.message);
        } finally {
            setBusy(false);
        }
    };

    const resolved = message.status === 'resolved';
    return (
        <motion.article layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white text-charcoal p-5 md:p-6 relative min-w-0 flex flex-col">
            <button type="button" onClick={onDelete} aria-label={`Delete message from ${message.name}`} className="absolute top-4 right-4 text-gray-400 hover:text-red-500">
                <Trash2 size={14} />
            </button>
            <div className="flex flex-wrap items-center gap-2 pr-8 mb-1">
                <p className="font-script text-2xl leading-tight truncate">{message.name}</p>
                <Badge>{message.userId ? 'Member' : 'Visitor'}</Badge>
                <Badge tone={resolved ? 'sage' : 'red'}>{resolved ? 'Resolved' : 'Open'}</Badge>
            </div>
            <a href={`mailto:${message.email}`} className="text-xs text-sage-dark hover:underline break-all">{message.email}</a>
            <p className="text-[0.6rem] uppercase tracking-widest text-gray-400 mt-1 mb-4">{message.topicLabel} · {formatDate(message.createdAt)}</p>
            <p className="text-sm whitespace-pre-line break-words mb-5">{message.message}</p>

            <form
                className="mt-auto"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (reply.trim()) save({ reply, status: 'resolved' }, 'Reply sent and marked resolved');
                }}
            >
                <label className="block text-[0.6rem] uppercase tracking-widest text-gray-500 mb-2" htmlFor={`reply-${message.id}`}>
                    {message.repliedAt ? `Your reply · ${formatDate(message.repliedAt)}` : 'Reply'}
                </label>
                <textarea
                    id={`reply-${message.id}`}
                    rows={3}
                    maxLength={5000}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={message.userId ? 'They see this on their Help & Support page and by email' : 'Sent to them by email'}
                    className="w-full border border-gray-200 focus:border-charcoal outline-none p-3 text-sm resize-y"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                    <button type="submit" disabled={busy || !reply.trim() || reply.trim() === message.reply} className={`${rowButton} bg-charcoal text-white border-charcoal hover:bg-black`}>
                        <Send size={12} /> Send reply
                    </button>
                    <button type="button" disabled={busy} onClick={() => save({ status: resolved ? 'open' : 'resolved' }, resolved ? 'Reopened' : 'Marked resolved')} className={rowButton}>
                        {resolved ? <><RotateCcw size={12} /> Reopen</> : <><CheckCircle2 size={12} /> Mark resolved</>}
                    </button>
                </div>
            </form>
        </motion.article>
    );
};

const ComplaintsTab = () => {
    const { showToast } = useToast();
    const [filter, setFilter] = useState('open');
    const { data, loading, error, reload, setData } = useAdminData(`/admin-panel/messages/${filter ? `?status=${filter}` : ''}`);

    const change = (updated) => setData(d => ({
        open: d.open + (updated.status === 'open' ? 1 : 0) - (d.messages.find(m => m.id === updated.id)?.status === 'open' ? 1 : 0),
        // Leave a card in place until the filter changes, so the reply you just sent stays visible
        messages: d.messages.map(m => (m.id === updated.id ? updated : m)),
    }));

    const remove = (message) => {
        if (!window.confirm(`Delete the message from ${message.name}?`)) return;
        api(`/admin-panel/messages/${message.id}/`, { method: 'DELETE' })
            .then(() => {
                setData(d => ({ open: d.open - (message.status === 'open' ? 1 : 0), messages: d.messages.filter(m => m.id !== message.id) }));
                showToast('Message deleted');
            })
            .catch(err => showToast(err.message));
    };

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 mb-6">
                {FILTERS.map(f => (
                    <Pill key={f.label} active={filter === f.slug} onClick={() => setFilter(f.slug)}>
                        {f.label}{f.slug === 'open' && data ? ` (${data.open})` : ''}
                    </Pill>
                ))}
            </div>
            {!data ? <Status loading={loading} error={error} onRetry={reload} /> : data.messages.length === 0 ? (
                <Empty icon={Mail} title={filter === 'open' ? 'All caught up' : 'Nothing here'} text="Complaints from members and messages from the contact page show up here" />
            ) : (
                <div className="grid md:grid-cols-2 gap-6">
                    <AnimatePresence initial={false}>
                        {data.messages.map(message => (
                            <Complaint key={message.id} message={message} onChange={change} onDelete={() => remove(message)} />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

// ---------- Page ----------

const AdminPage = () => {
    const { user } = useAuth();
    const [params, setParams] = useSearchParams();
    const tab = TABS.some(t => t.slug === params.get('tab')) ? params.get('tab') : 'overview';

    if (!user?.isAdmin) return <Navigate to="/dashboard" replace />;

    return (
        <PageShell eyebrow="Behind the seams" title="Admin Panel">
            <div className="flex flex-wrap gap-2 mb-10">
                {TABS.map(t => (
                    <Pill key={t.slug} active={tab === t.slug} onClick={() => setParams(t.slug === 'overview' ? {} : { tab: t.slug }, { replace: true })}>
                        {t.label}
                    </Pill>
                ))}
            </div>
            {tab === 'overview' && <Overview />}
            {tab === 'users' && <UsersTab />}
            {tab === 'complaints' && <ComplaintsTab />}
        </PageShell>
    );
};

export default AdminPage;
