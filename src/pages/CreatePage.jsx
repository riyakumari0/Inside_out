import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Shuffle, CalendarCheck, Bookmark, Trash2, X, ShoppingBag, ImagePlus, ExternalLink, Download, Palette } from 'lucide-react';
import PageShell, { Pill } from '../components/PageShell';
import useWardrobe from '../hooks/useWardrobe';
import useToast from '../hooks/useToast';
import { api } from '../api/client';
import { VIBES, vibeLabel } from '../data/vibes';
import { currentSeason } from '../utils/outfit';
import { primaryButton, secondaryButton, ghostButton } from '../utils/styles';

const TILTS = [-6, 4, -3, 7, -5, 3];

const Spinner = () => (
    <motion.span
        className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
);

const AiChip = ({ ai }) => (
    <span className={`inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-widest px-2 py-1 ${ai ? 'bg-white text-sage-dark' : 'bg-white/20 text-white'}`}>
        <Sparkles size={10} /> {ai ? 'Styled by Gemini' : 'Quick rules · AI offline'}
    </span>
);

// Collage of polaroids, the same visual language as the landing hero
const Polaroid = ({ item, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 60, rotate: 0, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, rotate: TILTS[index % TILTS.length], scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.8 }}
        transition={{ delay: index * 0.1, type: 'spring', stiffness: 120, damping: 14 }}
        whileHover={{ rotate: 0, scale: 1.05, zIndex: 10 }}
        className="bg-white p-2 pb-8 shadow-xl w-32 sm:w-40 md:w-48 relative"
    >
        <Link to={`/wardrobe/${item.id}`} className="block">
            <div className="aspect-[3/4] bg-[#B5C1AE] overflow-hidden">
                {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
            </div>
            <p className="absolute bottom-1.5 inset-x-0 text-center font-script text-base text-charcoal truncate px-2">{item.name}</p>
            <span className="absolute top-3 left-3 bg-white/90 text-charcoal text-[0.55rem] uppercase tracking-widest px-1.5 py-0.5">{item.category}</span>
        </Link>
    </motion.div>
);

// The manifested outfit as one moodboard image (made on the server from the pieces' cut-outs).
// While it loads, or if it can't be made, the polaroids show instead.
const OutfitCollage = ({ items, round, name }) => {
    const [state, setState] = useState({ key: null, image: null });
    const key = items.map(i => i.id).join(',');

    useEffect(() => {
        let cancelled = false;
        api('/stylist/collage-preview/', { method: 'POST', body: { itemIds: items.map(i => i.id) } })
            .then(data => !cancelled && setState({ key, image: data.image }))
            .catch(() => !cancelled && setState({ key, image: null }));
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- redraw when the pieces change
    }, [key]);

    const ready = state.key === key;
    if (ready && !state.image) {
        return (
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 py-8">
                <AnimatePresence mode="popLayout">
                    {items.map((item, i) => <Polaroid key={`${round}-${item.id}`} item={item} index={i} />)}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="py-8 flex flex-col items-center">
            <motion.div
                key={`collage-${round}`}
                initial={{ opacity: 0, y: 40, rotate: 0, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, rotate: -1.5, scale: 1 }}
                transition={{ type: 'spring', stiffness: 110, damping: 15 }}
                whileHover={{ rotate: 0 }}
                className="bg-white p-3 pb-10 shadow-2xl relative w-64 sm:w-72"
            >
                <div className="aspect-[9/16] bg-[#ECECE9] overflow-hidden relative">
                    {ready && <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} src={state.image} alt={`${name}: the full outfit`} className="w-full h-full object-cover" />}
                    {!ready && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sage-dark">
                            <motion.span
                                className="inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                            />
                            <span className="text-[0.65rem] uppercase tracking-widest">Laying out your look…</span>
                        </div>
                    )}
                </div>
                <p className="absolute bottom-2 inset-x-0 text-center font-script text-xl text-charcoal truncate px-3">{name}</p>
            </motion.div>

            {/* The pieces in it, each opening its own page */}
            <div className="flex flex-wrap justify-center gap-2 mt-6">
                {items.map(item => (
                    <Link key={item.id} to={`/wardrobe/${item.id}`} title={item.name} className="w-12 h-12 bg-white p-1 shadow hover:-translate-y-0.5 transition">
                        {(item.cutout && item.useCutout ? item.cutout : item.image) && (
                            <img src={item.cutout && item.useCutout ? item.cutout : item.image} alt={item.name} className="w-full h-full object-contain" />
                        )}
                    </Link>
                ))}
            </div>
            {ready && (
                <a href={state.image} download={`${name}.jpg`} className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/80 hover:text-white">
                    <Download size={12} /> Save image
                </a>
            )}
        </div>
    );
};

const ScoreRing = ({ score }) => {
    const r = 34;
    const c = 2 * Math.PI * r;
    return (
        <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="6" />
                <motion.circle
                    cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={c}
                    initial={{ strokeDashoffset: c }}
                    animate={{ strokeDashoffset: c * (1 - score / 10) }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-sans text-3xl font-medium">{score}</span>
        </div>
    );
};

// One missing piece → real products from Google Shopping (or store search links if no key)
const ShopTheGap = ({ piece, lookId }) => {
    const { showToast } = useToast();
    const { bag, saveToBag, removeFromBag } = useWardrobe();
    const [state, setState] = useState({ status: 'idle', products: [], live: false });

    const find = async () => {
        setState(s => ({ ...s, status: 'loading' }));
        try {
            const { products, live } = await api('/stylist/shop/', { method: 'POST', body: { query: piece.search_query } });
            setState({ status: 'done', products, live });
        } catch (err) {
            showToast(err.message);
            setState(s => ({ ...s, status: 'idle' }));
        }
    };

    return (
        <div className="bg-white/10 border border-white/20 p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="min-w-0">
                    <p className="text-[0.6rem] uppercase tracking-widest text-white/60">{piece.category}</p>
                    <p className="font-script text-2xl leading-tight">{piece.description}</p>
                    <p className="text-xs text-white/80 mt-1">{piece.why}</p>
                </div>
                {state.status !== 'done' && (
                    <button type="button" onClick={find} disabled={state.status === 'loading'} className={`${secondaryButton} shrink-0`}>
                        {state.status === 'loading' ? <Spinner /> : <ShoppingBag size={14} />} Find products
                    </button>
                )}
            </div>

            {state.status === 'done' && (
                <>
                    {!state.live && <p className="text-[0.65rem] uppercase tracking-widest text-white/60 mb-3">Store searches · add a SerpAPI key for exact products</p>}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {state.products.map(p => (
                            <div key={p.link} className="relative min-w-0 flex">
                            <a
                                href={p.link}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                className="group bg-white text-charcoal flex flex-col hover:shadow-xl transition-shadow min-w-0 w-full"
                            >
                                {p.thumbnail && (
                                    <div className="aspect-square bg-off-white overflow-hidden">
                                        <img src={p.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                )}
                                <div className="p-3 flex flex-col gap-1 flex-1">
                                    <p className="text-xs leading-snug line-clamp-2">{p.title}</p>
                                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                                        <span className="text-sm font-bold">{p.price ?? ''}</span>
                                        <span className="text-[0.6rem] uppercase tracking-widest text-gray-500 truncate flex items-center gap-1">
                                            {p.source} <ExternalLink size={10} />
                                        </span>
                                    </div>
                                </div>
                            </a>
                            {state.live && (() => {
                                const saved = bag.find(b => b.link === p.link);
                                return (
                                    <button
                                        type="button"
                                        onClick={() => (saved
                                            ? removeFromBag(saved.id).then(() => showToast('Removed from your bag'))
                                            : saveToBag(p, lookId).then(() => showToast('Saved to your bag'))
                                        ).catch(err => showToast(err.message))}
                                        aria-label={saved ? `Remove ${p.title} from bag` : `Save ${p.title} to bag`}
                                        aria-pressed={Boolean(saved)}
                                        className={`absolute top-2 right-2 p-1.5 rounded-full shadow bg-white hover:text-sage-dark ${saved ? 'text-sage-dark' : 'text-charcoal'}`}
                                    >
                                        <ShoppingBag size={14} fill={saved ? 'currentColor' : 'none'} />
                                    </button>
                                );
                            })()}
                            </div>
                        ))}
                    </div>
                    {state.products.length === 0 && <p className="text-xs text-white/70">No products found. Try again later.</p>}
                </>
            )}
        </div>
    );
};

// The finalized look: its collage, Gemini's evaluation, shopping suggestions and an optional AI image
const FinalLook = ({ look, onClose }) => {
    const { getItem, visualizeLook, buildCollage } = useWardrobe();
    const { showToast } = useToast();
    const [isDrawing, setIsDrawing] = useState(false);
    const [isCollaging, setIsCollaging] = useState(false);
    const [view, setView] = useState('collage');
    const evaluation = look.evaluation;
    const pieces = look.itemIds.map(getItem).filter(Boolean);
    const hasPhotos = pieces.some(p => p.image);
    const shown = view === 'ai' && look.image ? look.image : (look.collage || look.image);
    const isCollage = Boolean(shown) && shown === look.collage;

    // Looks saved before collages existed get theirs the first time they're opened
    const askedForCollage = useRef(false);
    useEffect(() => {
        if (look.collage || !hasPhotos || askedForCollage.current) return;
        askedForCollage.current = true;
        setIsCollaging(true);
        buildCollage(look.id).catch(err => showToast(err.message)).finally(() => setIsCollaging(false));
    }, [look.collage, look.id, hasPhotos, buildCollage, showToast]);

    const draw = async () => {
        setIsDrawing(true);
        try {
            await visualizeLook(look.id);
            setView('ai');
            showToast('AI outfit image ready ✨');
        } catch (err) {
            showToast(err.message);
        } finally {
            setIsDrawing(false);
        }
    };

    return (
        <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-sage-dark/40 border border-white/20 p-5 md:p-8 mb-16 relative"
        >
            <button type="button" onClick={onClose} aria-label="Close look" className="absolute top-4 right-4 text-white/70 hover:text-white">
                <X size={18} />
            </button>
            <p className="text-xs uppercase tracking-[0.2em] opacity-80 mb-1 pr-8 break-words">Final look · {look.event || vibeLabel(look.vibe) || 'Everyday'}</p>
            <h2 className="font-script text-4xl md:text-5xl mb-8 pr-8">{look.name}</h2>

            <div className="grid lg:grid-cols-5 gap-8 lg:gap-10">
                {/* Outfit image: the collage of your own pieces, or Gemini's AI version */}
                <div className="lg:col-span-2">
                    {look.collage && look.image && (
                        <div className="flex justify-center gap-2 mb-5">
                            <Pill active={isCollage} onClick={() => setView('collage')}>Collage</Pill>
                            <Pill active={!isCollage} onClick={() => setView('ai')}>AI Image</Pill>
                        </div>
                    )}
                    <div className={`bg-white p-3 pb-10 shadow-2xl -rotate-1 relative mx-auto ${isCollage ? 'max-w-xs' : 'max-w-sm'}`}>
                        <div className={`${isCollage ? 'aspect-[9/16] bg-[#ECECE9]' : 'aspect-[4/5] bg-[#B5C1AE]'} overflow-hidden relative`}>
                            {shown ? (
                                <motion.img key={shown} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} src={shown} alt={look.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="grid grid-cols-2 gap-1 w-full h-full p-1">
                                    {pieces.slice(0, 4).map(p => (
                                        <div key={p.id} className="bg-white/40 overflow-hidden">{p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" />}</div>
                                    ))}
                                </div>
                            )}
                            {isCollaging && !isDrawing && (
                                <div className="absolute inset-0 bg-sage-dark/50 flex flex-col items-center justify-center text-white gap-3">
                                    <Spinner />
                                    <span className="text-xs uppercase tracking-widest">Laying out your look…</span>
                                </div>
                            )}
                            {isDrawing && (
                                <div className="absolute inset-0 bg-sage-dark/50 flex flex-col items-center justify-center text-white gap-3">
                                    <motion.div animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                                        <Palette size={32} />
                                    </motion.div>
                                    <span className="text-xs uppercase tracking-widest">Gemini is styling the shot…</span>
                                </div>
                            )}
                        </div>
                        <p className="absolute bottom-2 inset-x-0 text-center font-script text-xl text-charcoal truncate px-3">{look.name}</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-6">
                        <button type="button" onClick={draw} disabled={isDrawing} className={primaryButton}>
                            {isDrawing ? <Spinner /> : <ImagePlus size={14} />} {look.image ? 'Re-create Image' : 'Create Outfit Image'}
                        </button>
                        {shown && (
                            <a href={shown} download={`${look.name}${shown.endsWith('.png') ? '.png' : '.jpg'}`} className={ghostButton}>
                                <Download size={14} /> Save
                            </a>
                        )}
                    </div>
                </div>

                {/* Evaluation */}
                <div className="lg:col-span-3 min-w-0">
                    {evaluation ? (
                        <>
                            <div className="flex items-center gap-5 mb-6">
                                <ScoreRing score={evaluation.score} />
                                <div className="min-w-0">
                                    <AiChip ai={evaluation.ai} />
                                    <p className="font-script text-2xl md:text-3xl mt-2 leading-tight">{evaluation.verdict}</p>
                                </div>
                            </div>
                            <dl className="grid sm:grid-cols-2 gap-4 mb-6 text-sm">
                                <div className="border-t border-white/20 pt-3">
                                    <dt className="text-[0.6rem] uppercase tracking-widest text-white/60 mb-1">Colour harmony</dt>
                                    <dd>{evaluation.color_harmony}</dd>
                                </div>
                                <div className="border-t border-white/20 pt-3">
                                    <dt className="text-[0.6rem] uppercase tracking-widest text-white/60 mb-1">Vibe fit</dt>
                                    <dd>{evaluation.vibe_fit}</dd>
                                </div>
                            </dl>
                            {evaluation.tips?.length > 0 && (
                                <ul className="space-y-2 mb-8">
                                    {evaluation.tips.map(tip => (
                                        <li key={tip} className="flex gap-2 text-sm"><Sparkles size={14} className="mt-0.5 shrink-0" /> {tip}</li>
                                    ))}
                                </ul>
                            )}
                            {evaluation.missing?.length > 0 && (
                                <>
                                    <h3 className="text-xs uppercase tracking-widest mb-4 flex items-center gap-2"><ShoppingBag size={14} /> Shop the gap</h3>
                                    <div className="flex flex-col gap-4">
                                        {evaluation.missing.map(piece => <ShopTheGap key={piece.search_query} piece={piece} lookId={look.id} />)}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-3 text-sm"><Spinner /> Your stylist is evaluating the look…</div>
                    )}
                </div>
            </div>
        </motion.section>
    );
};

const CreatePage = () => {
    const { items, looks, getItem, getLook, markWorn, saveLook, removeLook, evaluateLook } = useWardrobe();
    const { showToast } = useToast();
    const [params, setParams] = useSearchParams();
    const anchorId = params.get('with');
    const anchor = anchorId ? getItem(anchorId) : null;
    const finalRef = useRef(null);

    const [vibe, setVibe] = useState(params.get('vibe') ?? '');
    const [event, setEvent] = useState(params.get('event') ?? '');
    const [outfit, setOutfit] = useState(null);
    const [round, setRound] = useState(0);
    const [isStyling, setIsStyling] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [error, setError] = useState('');
    const [activeLookId, setActiveLookId] = useState(null);
    const activeLook = activeLookId ? getLook(activeLookId) : null;

    const manifest = async ({ shuffle = false } = {}) => {
        setIsStyling(true);
        setError('');
        try {
            const result = await api('/stylist/outfit/', {
                method: 'POST',
                body: { vibe, event: event.trim(), anchorId: anchor?.id ?? null, previousIds: shuffle && outfit ? outfit.itemIds : [] },
            });
            setOutfit(result);
            setRound(r => r + 1);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsStyling(false);
        }
    };

    const finalize = async () => {
        setIsFinalizing(true);
        try {
            const look = await saveLook({ name: outfit.name, vibe: outfit.vibe || vibe, event: outfit.event, itemIds: outfit.itemIds, reasoning: outfit.reasoning });
            setActiveLookId(look.id);
            setTimeout(() => finalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            await evaluateLook(look.id);
        } catch (err) {
            showToast(err.message);
        } finally {
            setIsFinalizing(false);
        }
    };

    const openLook = (id) => {
        setActiveLookId(id);
        setTimeout(() => finalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        const look = getLook(id);
        if (look && !look.evaluation) evaluateLook(id).catch(err => showToast(err.message));
    };

    // Arriving from a featured style (?vibe=) or a piece's "Style it" (?with=) starts styling straight away
    const autoStarted = useRef(false);
    useEffect(() => {
        if (autoStarted.current || !items.length || !(params.get('vibe') || params.get('event') || anchorId)) return;
        autoStarted.current = true;
        manifest();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on arrival
    }, []);

    const clearAnchor = () => {
        const next = new URLSearchParams(params);
        next.delete('with');
        setParams(next, { replace: true });
    };

    const outfitItems = outfit ? outfit.itemIds.map(getItem).filter(Boolean) : [];

    return (
        <PageShell eyebrow="Set the vibe" title="Manifest the Fit">
            {items.length === 0 ? (
                <div className="border border-dashed border-white/50 py-16 px-6 text-center">
                    <p className="font-script text-3xl mb-2">Your closet is empty</p>
                    <p className="text-xs uppercase tracking-widest text-white/70 mb-8">Add a top, a bottom, footwear and an accessory to start</p>
                    <Link to="/wardrobe/new" className={primaryButton}>Add to Wardrobe</Link>
                </div>
            ) : (
                <>
                    {/* Step 1: vibe */}
                    <section className="mb-10">
                        <p className="text-xs uppercase tracking-widest text-white/80 mb-4">What's the occasion?</p>
                        <div className="flex flex-wrap gap-2">
                            <Pill active={!vibe} onClick={() => setVibe('')}>Surprise me</Pill>
                            {VIBES.map(v => (
                                <Pill key={v.slug} active={vibe === v.slug} onClick={() => setVibe(v.slug)}>{v.label}</Pill>
                            ))}
                        </div>

                        {/* Or describe the real event in your own words */}
                        <form
                            className="mt-6 max-w-2xl"
                            onSubmit={(e) => { e.preventDefault(); if (!isStyling) manifest(); }}
                        >
                            <label htmlFor="event" className="block text-xs uppercase tracking-widest text-white/80 mb-3">Or describe your event</label>
                            <div className="relative">
                                <input
                                    id="event"
                                    type="text"
                                    value={event}
                                    maxLength={200}
                                    onChange={(e) => setEvent(e.target.value)}
                                    placeholder="e.g. Cousin's wedding reception, evening, outdoors"
                                    className="w-full bg-transparent border border-white/40 focus:border-white text-white placeholder-white/50 px-4 py-3 pr-10 text-sm focus:outline-none transition"
                                />
                                {event && (
                                    <button type="button" onClick={() => setEvent('')} aria-label="Clear event" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </form>

                        {anchor && (
                            <div className="mt-6 inline-flex items-center gap-3 bg-white/15 pl-2 pr-3 py-2">
                                {anchor.image && <img src={anchor.image} alt="" className="w-8 h-10 object-cover" />}
                                <span className="text-xs uppercase tracking-widest">Built around: <strong>{anchor.name}</strong></span>
                                <button type="button" onClick={clearAnchor} aria-label="Stop building around this piece" className="hover:text-charcoal">
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <motion.button type="button" onClick={() => manifest()} disabled={isStyling} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className={primaryButton}>
                                {isStyling ? <Spinner /> : <Sparkles size={14} />} {isStyling ? 'Styling…' : outfit ? 'Manifest Again' : 'Manifest the Fit'}
                            </motion.button>
                            <p className="text-xs uppercase tracking-widest text-white/70">Styled for {currentSeason()} · from your {items.length} pieces</p>
                        </div>
                        {error && <p className="mt-4 text-sm bg-white/90 text-red-600 px-4 py-2 inline-block" role="alert">{error}</p>}
                    </section>

                    {/* Step 2: the look */}
                    <section className="min-h-[200px] mb-16">
                        {outfit && outfitItems.length > 0 && (
                            <>
                                <OutfitCollage items={outfitItems} round={round} name={outfit.name} />
                                <motion.div key={`about-${round}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center max-w-2xl mx-auto">
                                    <AiChip ai={outfit.ai} />
                                    <p className="font-script text-4xl mt-3 mb-3">{outfit.name}</p>
                                    <p className="text-sm text-white/90 mb-2">{outfit.reasoning}</p>
                                    <p className="text-xs uppercase tracking-widest text-white/70 mb-2 flex items-center justify-center gap-2">
                                        <Palette size={12} /> {outfit.colorStory}
                                    </p>
                                    <div className="w-40 h-1 bg-white/20 mx-auto mb-6" title={`Colour harmony ${Math.round(outfit.harmony.score * 100)}%`}>
                                        <motion.div className="h-full bg-white" initial={{ width: 0 }} animate={{ width: `${outfit.harmony.score * 100}%` }} transition={{ duration: 1 }} />
                                    </div>
                                    {outfit.notes?.length > 0 && (
                                        <p className="text-xs text-white/80 mb-6">
                                            Your closet has {outfit.notes.join(' and ')}. <Link to="/wardrobe/new" className="underline hover:text-white">Add one</Link> for a complete look.
                                        </p>
                                    )}
                                    <div className="flex flex-wrap justify-center gap-3">
                                        <button type="button" onClick={() => manifest({ shuffle: true })} disabled={isStyling} className={ghostButton}><Shuffle size={14} /> Shuffle</button>
                                        <button
                                            type="button"
                                            onClick={() => markWorn(outfit.itemIds).then(() => showToast('Outfit logged for today ✓')).catch(err => showToast(err.message))}
                                            className={ghostButton}
                                        >
                                            <CalendarCheck size={14} /> Wear it today
                                        </button>
                                        <button type="button" onClick={finalize} disabled={isFinalizing} className={secondaryButton}>
                                            {isFinalizing ? <Spinner /> : <Bookmark size={14} />} Finalize Look
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}

                        {!outfit && !isStyling && (
                            <div className="border border-dashed border-white/40 py-16 px-6 text-center">
                                <motion.div animate={{ rotate: [0, 12, -8, 0] }} transition={{ duration: 3, repeat: Infinity }} className="inline-block mb-4">
                                    <Sparkles size={36} strokeWidth={1.25} />
                                </motion.div>
                                <p className="font-script text-3xl">Pick a vibe or describe your event, then manifest</p>
                                <p className="text-xs uppercase tracking-widest text-white/70 mt-2">Top + bottom or a dress · footwear · accessories · colour-coordinated</p>
                            </div>
                        )}
                    </section>

                    {/* Step 3: the final look */}
                    <div ref={finalRef} className="scroll-mt-24">
                        <AnimatePresence>
                            {activeLook && <FinalLook key={activeLook.id} look={activeLook} onClose={() => setActiveLookId(null)} />}
                        </AnimatePresence>
                    </div>
                </>
            )}

            {/* Saved looks */}
            {looks.length > 0 && (
                <section>
                    <h2 className="text-xl font-sans mb-8 uppercase tracking-widest">Saved Looks</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {looks.map(look => {
                            const pieces = look.itemIds.map(getItem).filter(Boolean);
                            return (
                                <motion.div key={look.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`bg-white/10 border p-4 ${activeLookId === look.id ? 'border-white' : 'border-white/20'}`}>
                                    <button type="button" onClick={() => openLook(look.id)} className="block w-full text-left mb-4">
                                        {look.collage || look.image ? (
                                            <div className="h-40 overflow-hidden bg-[#ECECE9]"><img src={look.collage || look.image} alt={look.name} className={`w-full h-full ${look.collage ? 'object-contain' : 'object-cover'} hover:scale-105 transition-transform duration-500`} /></div>
                                        ) : (
                                            <div className="flex gap-2 h-28">
                                                {pieces.slice(0, 4).map(p => (
                                                    <div key={p.id} className="flex-1 min-w-0 bg-[#B5C1AE] overflow-hidden">
                                                        {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" />}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                    <div className="flex items-start justify-between gap-3">
                                        <button type="button" onClick={() => openLook(look.id)} className="min-w-0 text-left">
                                            <p className="font-script text-2xl truncate">{look.name}</p>
                                            <p className="text-[0.65rem] uppercase tracking-widest text-white/70 truncate">
                                                {look.evaluation ? `Score ${look.evaluation.score}/10 · ` : ''}{look.event ? `${look.event} · ` : ''}{pieces.length} pieces
                                            </p>
                                        </button>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => markWorn(look.itemIds).then(() => showToast('Outfit logged for today ✓')).catch(err => showToast(err.message))}
                                                aria-label={`Wear ${look.name} today`}
                                                className="p-2 border border-white/40 hover:bg-white hover:text-charcoal transition"
                                            >
                                                <CalendarCheck size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!window.confirm(`Delete "${look.name}"?`)) return;
                                                    if (activeLookId === look.id) setActiveLookId(null);
                                                    removeLook(look.id).then(() => showToast('Look deleted')).catch(err => showToast(err.message));
                                                }}
                                                aria-label={`Delete ${look.name}`}
                                                className="p-2 border border-white/40 hover:bg-red-500 hover:border-red-500 transition"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
            )}
        </PageShell>
    );
};

export default CreatePage;
