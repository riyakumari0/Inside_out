import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import PageShell, { Pill } from '../components/PageShell';
import WardrobeCard from '../components/WardrobeCard';
import useWardrobe from '../hooks/useWardrobe';
import { CATEGORIES } from '../data/wardrobe';
import { vibeLabel } from '../data/vibes';
import { primaryButton } from '../utils/styles';

const SORTS = {
    new: { label: 'Newest', fn: (a, b) => b.createdAt.localeCompare(a.createdAt) },
    most: { label: 'Most worn', fn: (a, b) => b.wornCount - a.wornCount },
    least: { label: 'Least worn', fn: (a, b) => a.wornCount - b.wornCount },
    name: { label: 'A – Z', fn: (a, b) => a.name.localeCompare(b.name) },
};

const matches = (item, q) => {
    const haystack = [item.name, item.category, ...item.colors, ...item.tags.map(vibeLabel), ...item.tags, ...item.seasons].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(word => haystack.includes(word));
};

// Search, filter and sort live in the URL, so the navbar search and the
// "New In" links can point straight at a filtered view
const CollectionsPage = () => {
    const { items } = useWardrobe();
    const [params, setParams] = useSearchParams();
    const q = params.get('q') ?? '';
    const category = params.get('category') ?? 'all';
    const isNewIn = params.get('view') === 'new';
    const sort = params.get('sort') ?? 'new';

    const update = (key, value) => {
        const next = new URLSearchParams(params);
        if (value) next.set(key, value);
        else next.delete(key);
        setParams(next, { replace: true });
    };

    const results = items
        .filter(item => category === 'all' || item.category === category)
        .filter(item => !q || matches(item, q))
        .sort(SORTS[sort]?.fn ?? SORTS.new.fn)
        .slice(0, isNewIn && !q && category === 'all' ? 8 : undefined);

    const counts = Object.fromEntries(CATEGORIES.map(c => [c, items.filter(i => i.category === c).length]));

    return (
        <PageShell
            eyebrow={isNewIn ? 'Fresh in your closet' : 'Everything you own'}
            title={isNewIn ? 'New In' : 'Collections'}
        >
            {/* Controls */}
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-6">
                <div className="relative w-full lg:max-w-sm">
                    <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
                    <input
                        type="search"
                        value={q}
                        onChange={(e) => update('q', e.target.value)}
                        placeholder="Search name, colour, vibe, season…"
                        aria-label="Search your wardrobe"
                        className="w-full bg-transparent border-b border-white/50 focus:border-white outline-none py-2 pl-7 pr-7 text-sm placeholder-white/50"
                    />
                    {q && (
                        <button type="button" onClick={() => update('q', '')} aria-label="Clear search" className="absolute right-0 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <label className="flex items-center gap-3 text-xs uppercase tracking-widest text-white/80">
                    Sort
                    <select
                        value={sort}
                        onChange={(e) => update('sort', e.target.value)}
                        className="bg-transparent border border-white/40 px-3 py-2 text-xs uppercase tracking-widest outline-none focus:border-white [&>option]:text-charcoal"
                    >
                        {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
                    </select>
                </label>
            </div>

            <div className="flex flex-wrap gap-2 mb-10">
                <Pill active={category === 'all'} onClick={() => update('category', '')}>All · {items.length}</Pill>
                {CATEGORIES.filter(c => counts[c]).map(c => (
                    <Pill key={c} active={category === c} onClick={() => update('category', c)}>{c} · {counts[c]}</Pill>
                ))}
            </div>

            {results.length ? (
                <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
                    <AnimatePresence>
                        {results.map(item => (
                            <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                                <WardrobeCard item={item} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <div className="border border-dashed border-white/50 py-16 px-6 text-center">
                    <p className="font-script text-3xl mb-2">Nothing matches{q ? ` “${q}”` : ''}</p>
                    <p className="text-xs uppercase tracking-widest text-white/70 mb-8">Try another word, or add a new piece</p>
                    <Link to="/wardrobe/new" className={primaryButton}>Add to Wardrobe</Link>
                </div>
            )}
        </PageShell>
    );
};

export default CollectionsPage;
