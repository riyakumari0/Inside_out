import React, { useRef, useState } from 'react';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, X, Check, Sparkles } from 'lucide-react';
import PageShell, { Pill } from '../components/PageShell';
import { primaryButton, secondaryButton } from '../utils/styles';
import useWardrobe from '../hooks/useWardrobe';
import useToast from '../hooks/useToast';
import { processClothingPhoto } from '../utils/image';
import { api, toFormData } from '../api/client';
import { CATEGORIES, COLORS, SEASONS } from '../data/wardrobe';
import { VIBES, vibeLabel } from '../data/vibes';

const toggleInList = (list, value) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

const Label = ({ children, htmlFor }) => (
    <label htmlFor={htmlFor} className="block text-xs uppercase tracking-widest text-white/80 mb-3">{children}</label>
);

const LIGHT_SWATCHES = ['white', 'beige', 'yellow', 'pink', 'silver'];

// Used for both "add a piece" (/wardrobe/new) and "edit" (/wardrobe/:id/edit)
const AddItemPage = () => {
    const { id } = useParams();
    const { addItem, updateItem, getItem } = useWardrobe();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const touched = useRef(new Set());
    const existing = id ? getItem(id) : null;

    const [image, setImage] = useState(existing?.image ?? null);
    const [photoBlob, setPhotoBlob] = useState(null);
    const [photoRemoved, setPhotoRemoved] = useState(false);
    const [aiStatus, setAiStatus] = useState(''); // '', 'reading', 'done', 'offline'
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [name, setName] = useState(existing?.name ?? '');
    const [category, setCategory] = useState(existing?.category ?? CATEGORIES[0]);
    const [colors, setColors] = useState(existing?.colors ?? []);
    const [seasons, setSeasons] = useState(existing?.seasons ?? []);
    const [tags, setTags] = useState(existing?.tags ?? []);
    const [pattern, setPattern] = useState(existing?.pattern ?? '');
    const [tagInput, setTagInput] = useState('');
    const [price, setPrice] = useState(existing?.price ?? '');
    const [error, setError] = useState('');

    if (id && !existing) return <Navigate to="/dashboard" replace />;

    // Remember what the user set by hand so the AI never overwrites it
    const touch = (field, setter) => (value) => {
        touched.current.add(field);
        setter(value);
    };

    const applySuggestion = (s) => {
        const fill = (field, setter, value) => {
            if (value !== undefined && value !== null && !touched.current.has(field)) setter(value);
        };
        fill('name', setName, s.name);
        fill('category', setCategory, s.category);
        fill('colors', setColors, s.colors);
        fill('seasons', setSeasons, s.seasons);
        fill('tags', setTags, s.tags);
        fill('pattern', setPattern, s.pattern);
    };

    const handleFile = async (file) => {
        if (!file || !file.type.startsWith('image/')) {
            setError('Please choose an image file.');
            return;
        }
        setError('');
        setIsProcessing(true);
        try {
            const { blob, previewUrl, color } = await processClothingPhoto(file);
            setImage(previewUrl);
            setPhotoBlob(blob);
            setPhotoRemoved(false);
            if (!touched.current.has('colors')) setColors([color]);

            setAiStatus('reading');
            try {
                const { suggestion, ai } = await api('/stylist/analyze/', { method: 'POST', form: toFormData({ image: blob }) });
                applySuggestion(suggestion);
                setAiStatus(ai ? 'done' : 'offline');
            } catch {
                setAiStatus('offline');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const addTag = (value) => {
        const tag = value.trim().toLowerCase().replace(/\s+/g, '-');
        if (tag && !tags.includes(tag)) touch('tags', setTags)([...tags, tag]);
        setTagInput('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Give your piece a name.');
            return;
        }
        const fields = {
            name: name.trim(),
            category,
            colors,
            seasons,
            tags,
            pattern: pattern.trim(),
            price: price === '' ? null : Number(price),
        };
        setIsSaving(true);
        setError('');
        try {
            if (existing) {
                await updateItem(existing.id, { ...fields, removeImage: photoRemoved && !photoBlob }, photoBlob ?? undefined);
                showToast('Changes saved');
                navigate(`/wardrobe/${existing.id}`);
            } else {
                const item = await addItem(fields, photoBlob ?? undefined);
                showToast(`${item.name} added to your wardrobe`);
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message);
            setIsSaving(false);
        }
    };

    const backTo = existing ? `/wardrobe/${existing.id}` : '/dashboard';

    return (
        <PageShell
            width="max-w-5xl"
            back={{ to: backTo, label: existing ? 'Back to piece' : 'Back to wardrobe' }}
            eyebrow={existing ? 'Refine the details' : 'Digitize your closet'}
            title={existing ? 'Edit Piece' : 'Add a New Piece'}
        >
            <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-10 md:gap-12">
                {/* Photo */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div
                        role="button"
                        tabIndex={0}
                        aria-label="Upload a photo"
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            handleFile(e.dataTransfer.files[0]);
                        }}
                        className={`aspect-[3/4] max-h-[70vh] mx-auto relative overflow-hidden flex items-center justify-center border cursor-pointer transition ${isDragging ? 'bg-white/25 border-white' : 'bg-white/10 border-white/20 hover:bg-white/15'}`}
                    >
                        {image ? (
                            <>
                                <img src={image} alt="Preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setImage(null);
                                        setPhotoBlob(null);
                                        setPhotoRemoved(true);
                                        setAiStatus('');
                                    }}
                                    className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow-sm text-charcoal hover:text-red-500"
                                    aria-label="Remove photo"
                                >
                                    <X size={16} />
                                </button>
                                {/* Scanning shimmer while the stylist reads the photo */}
                                <AnimatePresence>
                                    {aiStatus === 'reading' && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 bg-sage-dark/30 flex items-end justify-center pb-6 pointer-events-none"
                                        >
                                            <motion.div
                                                className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-white/40 to-transparent"
                                                animate={{ top: ['-10%', '100%'] }}
                                                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                                            />
                                            <span className="relative bg-white text-charcoal text-xs uppercase tracking-widest px-4 py-2 flex items-center gap-2">
                                                <Sparkles size={14} /> Reading your piece…
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </>
                        ) : (
                            <div className="text-center p-6">
                                <Camera className="mx-auto mb-4 text-white/70" size={36} strokeWidth={1.25} />
                                <p className="font-script text-2xl mb-1">
                                    {isProcessing ? 'Developing your photo…' : 'Drop a photo here'}
                                </p>
                                <p className="text-xs uppercase tracking-widest text-white/60">One piece per photo · tap to browse</p>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                    {aiStatus === 'done' && (
                        <p className="mt-3 text-xs text-white/90 flex items-center gap-2">
                            <Sparkles size={14} /> Your stylist filled in the details. Change anything that's off.
                        </p>
                    )}
                    {aiStatus === 'offline' && (
                        <p className="mt-3 text-xs text-white/70">AI tagging is off, so we only guessed the colour. Fill in the rest below.</p>
                    )}
                </motion.div>

                {/* Details */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col gap-8 min-w-0">
                    <div>
                        <Label htmlFor="item-name">Name</Label>
                        <input
                            id="item-name"
                            type="text"
                            value={name}
                            onChange={(e) => touch('name', setName)(e.target.value)}
                            placeholder="e.g. Linen Summer Shirt"
                            className="w-full bg-transparent border-b border-white/50 focus:border-white outline-none py-2 font-script text-2xl placeholder-white/40"
                        />
                    </div>

                    <div>
                        <Label>Category</Label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map(c => (
                                <Pill key={c} active={category === c} onClick={() => touch('category', setCategory)(c)}>{c}</Pill>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label>Colours (main first)</Label>
                        <div className="flex flex-wrap gap-3">
                            {COLORS.map(c => (
                                <button
                                    key={c.name}
                                    type="button"
                                    title={c.name}
                                    aria-label={c.name}
                                    aria-pressed={colors.includes(c.name)}
                                    onClick={() => touch('colors', setColors)(toggleInList(colors, c.name))}
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition ${colors.includes(c.name) ? 'border-white scale-110' : 'border-white/30'}`}
                                    style={{ backgroundColor: c.hex }}
                                >
                                    {colors.includes(c.name) && (
                                        <Check size={14} className={LIGHT_SWATCHES.includes(c.name) ? 'text-charcoal' : 'text-white'} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="item-pattern">Pattern</Label>
                        <input
                            id="item-pattern"
                            type="text"
                            value={pattern}
                            onChange={(e) => touch('pattern', setPattern)(e.target.value)}
                            placeholder="solid, striped, floral…"
                            className="w-full bg-transparent border-b border-white/50 focus:border-white outline-none py-2 text-sm placeholder-white/40"
                        />
                    </div>

                    <div>
                        <Label>Seasons</Label>
                        <div className="flex flex-wrap gap-2">
                            {SEASONS.map(s => (
                                <Pill key={s} active={seasons.includes(s)} onClick={() => touch('seasons', setSeasons)(toggleInList(seasons, s))}>{s}</Pill>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="item-tag">Vibes</Label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map(t => (
                                <span key={t} className="bg-white text-charcoal px-3 py-1 text-xs uppercase tracking-widest flex items-center gap-1">
                                    {vibeLabel(t)}
                                    <button type="button" onClick={() => touch('tags', setTags)(tags.filter(x => x !== t))} aria-label={`Remove ${t}`}>
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            id="item-tag"
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    addTag(tagInput);
                                }
                            }}
                            placeholder="Type your own vibe and press Enter"
                            className="w-full bg-transparent border-b border-white/50 focus:border-white outline-none py-2 text-sm placeholder-white/40"
                        />
                        <div className="flex flex-wrap gap-2 mt-3">
                            {VIBES.filter(v => !tags.includes(v.slug)).map(v => (
                                <button
                                    key={v.slug}
                                    type="button"
                                    onClick={() => touch('tags', setTags)([...tags, v.slug])}
                                    className="text-xs text-white/70 hover:text-white border border-dashed border-white/40 hover:border-white px-2 py-1 transition"
                                >
                                    + {v.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="item-price">Price (optional)</Label>
                        <input
                            id="item-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="$ 0.00"
                            className="w-40 bg-transparent border-b border-white/50 focus:border-white outline-none py-2 text-sm placeholder-white/40"
                        />
                    </div>

                    {error && <p className="text-sm bg-white/90 text-red-600 px-4 py-2" role="alert">{error}</p>}

                    <div className="flex flex-wrap justify-end gap-3">
                        <Link to={backTo} className={secondaryButton}>Cancel</Link>
                        <button type="submit" disabled={isProcessing || isSaving} className={primaryButton}>
                            {isSaving ? 'Saving…' : existing ? 'Save Changes' : 'Add to Wardrobe'}
                        </button>
                    </div>
                </motion.div>
            </form>
        </PageShell>
    );
};

export default AddItemPage;
