import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Pencil, Trash2, Sparkles, CalendarCheck, Shirt } from 'lucide-react';
import PageShell, { Pill } from '../components/PageShell';
import { primaryButton, secondaryButton, ghostButton } from '../utils/styles';
import useWardrobe from '../hooks/useWardrobe';
import useToast from '../hooks/useToast';
import { colorHex } from '../data/wardrobe';
import { vibeLabel } from '../data/vibes';

const formatDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const Detail = ({ label, children }) => (
    <div className="py-4 border-b border-white/20">
        <p className="text-[0.65rem] uppercase tracking-widest text-white/60 mb-2">{label}</p>
        <div className="text-sm">{children}</div>
    </div>
);

const ItemPage = () => {
    const { id } = useParams();
    const { getItem, toggleFavorite, markWorn, removeItem, updateItem, cleanPhoto } = useWardrobe();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [isSwitching, setIsSwitching] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const item = getItem(id);

    const clean = (undo) => {
        setIsCleaning(true);
        cleanPhoto(item.id, undo)
            .then(() => showToast(undo ? 'Back to the cut-out from your photo' : 'Cleaned up ✨ only the piece is left'))
            .catch(err => showToast(err.message))
            .finally(() => setIsCleaning(false));
    };

    const setUseCutout = (useCutout) => {
        if (isSwitching || useCutout === item.useCutout) return;
        setIsSwitching(true);
        updateItem(item.id, { useCutout })
            .then(() => showToast(useCutout ? 'Outfit images use the cut-out' : 'Outfit images use the original photo'))
            .catch(err => showToast(err.message))
            .finally(() => setIsSwitching(false));
    };

    if (!item) return <Navigate to="/dashboard" replace />;

    const handleDelete = () => {
        if (!window.confirm(`Remove "${item.name}" from your wardrobe?`)) return;
        removeItem(item.id)
            .then(() => {
                showToast('Piece removed');
                navigate('/dashboard');
            })
            .catch(err => showToast(err.message));
    };

    return (
        <PageShell back={{ to: '/dashboard', label: 'Back to wardrobe' }} width="max-w-6xl">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start">
                {/* Polaroid-style photo, like the landing page collage */}
                <motion.div
                    initial={{ opacity: 0, rotate: -6, y: 30 }}
                    animate={{ opacity: 1, rotate: -2, y: 0 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    whileHover={{ rotate: 0, scale: 1.01 }}
                    className="bg-white p-3 pb-12 shadow-2xl max-w-md w-full mx-auto relative"
                >
                    <div className="aspect-[3/4] bg-[#B5C1AE] overflow-hidden flex items-center justify-center">
                        {item.image
                            ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            : <Shirt size={48} strokeWidth={1} className="text-white" />}
                    </div>
                    <p className="absolute bottom-3 inset-x-0 text-center font-script text-2xl text-charcoal truncate px-4">{item.name}</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="min-w-0">
                    <p className="font-sans text-xs tracking-[0.2em] uppercase mb-2 opacity-80">{item.category}</p>
                    <h1 className="font-sans text-4xl md:text-5xl font-medium uppercase leading-tight mb-6 break-words">{item.name}</h1>

                    <div className="flex flex-wrap gap-3 mb-8">
                        <button
                            type="button"
                            onClick={() => {
                                toggleFavorite(item.id)
                                    .then(() => showToast(item.favorite ? 'Removed from favorites' : 'Added to favorites ♡'))
                                    .catch(err => showToast(err.message));
                            }}
                            aria-pressed={item.favorite}
                            className={item.favorite ? secondaryButton : ghostButton}
                        >
                            <Heart size={14} fill={item.favorite ? 'currentColor' : 'none'} className={item.favorite ? 'text-red-500' : ''} />
                            {item.favorite ? 'Favorited' : 'Favorite'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                markWorn(item.id)
                                    .then(() => showToast('Logged as worn today ✓'))
                                    .catch(err => showToast(err.message));
                            }}
                            className={ghostButton}
                        >
                            <CalendarCheck size={14} /> Wore it today
                        </button>
                        <Link to={`/create?with=${item.id}`} className={primaryButton}>
                            <Sparkles size={14} /> Style it
                        </Link>
                    </div>

                    <Detail label="Colours">
                        {item.colors.length ? (
                            <div className="flex flex-wrap gap-3">
                                {item.colors.map(c => (
                                    <span key={c} className="flex items-center gap-2 capitalize">
                                        <span className="w-4 h-4 rounded-full border border-white/60" style={{ backgroundColor: colorHex(c) }} /> {c}
                                    </span>
                                ))}
                            </div>
                        ) : '—'}
                    </Detail>
                    <Detail label="Vibes">
                        {item.tags.length ? (
                            <div className="flex flex-wrap gap-2">
                                {item.tags.map(t => (
                                    <Link key={t} to={`/create?vibe=${t}`} className="border border-white/40 hover:bg-white hover:text-charcoal px-3 py-1 text-xs uppercase tracking-widest transition">
                                        {vibeLabel(t)}
                                    </Link>
                                ))}
                            </div>
                        ) : '—'}
                    </Detail>
                    <Detail label="Seasons"><span className="capitalize">{item.seasons.join(', ') || '—'}{item.pattern ? ` · ${item.pattern}` : ''}</span></Detail>
                    <Detail label="Wear log">
                        {item.wornCount ? `Worn ${item.wornCount}× · last on ${formatDate(item.lastWorn)}` : 'Not worn yet'}
                        {item.price != null && item.wornCount > 0 && (
                            <span className="block text-white/70 mt-1">Cost per wear: $ {(item.price / item.wornCount).toFixed(2)}</span>
                        )}
                    </Detail>
                    {item.price != null && <Detail label="Price">$ {item.price.toFixed(2)}</Detail>}
                    {item.image && (
                        <Detail label="In outfit images">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-20 shrink-0 bg-[#ECECE9] flex items-center justify-center p-1 relative">
                                    <img src={item.useCutout && item.cutout ? item.cutout : item.image} alt="" className={`max-w-full max-h-full object-contain ${isCleaning ? 'opacity-30' : ''}`} />
                                    {isCleaning && (
                                        <motion.span
                                            className="absolute w-5 h-5 border-2 border-sage-dark border-t-transparent rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                                        />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <Pill active={item.useCutout} onClick={() => setUseCutout(true)}>Cut-out</Pill>
                                        <Pill active={!item.useCutout} onClick={() => setUseCutout(false)}>Original photo</Pill>
                                    </div>
                                    <p className="text-xs text-white/70 mb-3">
                                        {item.cutoutAi
                                            ? 'This cut-out was cleaned up by AI from your photo.'
                                            : 'Still showing a mannequin, a model or a stand? Let AI redraw just this piece. Small details can change.'}
                                    </p>
                                    <button
                                        type="button"
                                        disabled={isCleaning}
                                        onClick={() => clean(item.cutoutAi)}
                                        className="inline-flex items-center gap-2 border border-white/60 px-3 py-2 text-[0.65rem] uppercase tracking-widest hover:bg-white hover:text-charcoal transition disabled:opacity-50"
                                    >
                                        <Sparkles size={12} /> {isCleaning ? 'Cleaning up…' : item.cutoutAi ? 'Use my photo instead' : 'Clean up with AI'}
                                    </button>
                                </div>
                            </div>
                        </Detail>
                    )}

                    <div className="flex flex-wrap gap-3 mt-8">
                        <Link to={`/wardrobe/${item.id}/edit`} className={secondaryButton}>
                            <Pencil size={14} /> Edit
                        </Link>
                        <button type="button" onClick={handleDelete} className={`${ghostButton} hover:!bg-red-500 hover:!border-red-500 hover:!text-white`}>
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                </motion.div>
            </div>
        </PageShell>
    );
};

export default ItemPage;
