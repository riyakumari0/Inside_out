import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Plus, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WardrobeCard from '../components/WardrobeCard';
import useWardrobe from '../hooks/useWardrobe';
import useAuth from '../hooks/useAuth';

const GRID_LIMIT = 8;

// What a closet needs before the stylist can build a complete outfit
const STARTER_STEPS = [
    { label: 'A top', done: (cats) => cats.has('top') || cats.has('dress') },
    { label: 'A bottom', done: (cats) => cats.has('bottom') || cats.has('dress') },
    { label: 'Footwear', done: (cats) => cats.has('footwear') },
    { label: 'An accessory', done: (cats) => cats.has('accessory') },
];

const Dashboard = () => {
    const { items, favorites } = useWardrobe();
    const { user } = useAuth();

    // The arch cycles through favorites first, then the rest of the closet
    const showcase = [...favorites, ...items.filter(i => !i.favorite)].filter(i => i.image);
    const [slide, setSlide] = useState(0);
    const current = showcase.length ? showcase[slide % showcase.length] : null;

    useEffect(() => {
        if (showcase.length < 2) return;
        const timer = setInterval(() => setSlide(s => s + 1), 4000);
        return () => clearInterval(timer);
    }, [showcase.length]);

    const firstName = user?.name?.split(' ')[0];
    const categories = new Set(items.map(i => i.category));
    const stepsDone = STARTER_STEPS.filter(step => step.done(categories)).length;
    const newest = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, GRID_LIMIT);

    return (
        <div className="bg-off-white min-h-screen flex flex-col font-sans text-charcoal">
            <Navbar />

            {/* Hero Section */}
            <header className="relative bg-[#A3B19C] min-h-[400px] flex flex-col lg:flex-row lg:items-center overflow-hidden">
                {/* Phone/tablet: arch sits below the heading. Desktop: arch floats on the right, aligned to the content column */}
                <div className="order-2 lg:order-none relative lg:absolute lg:bottom-0 lg:top-10 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-7xl flex justify-center lg:justify-end lg:pr-20 xl:pr-40">
                    <Link
                        to={current ? `/wardrobe/${current.id}` : '/wardrobe/new'}
                        className="bg-[#B5C1AE] w-[260px] h-[300px] md:w-[340px] md:h-[400px] lg:w-[400px] lg:h-[500px] rounded-t-full relative lg:translate-y-20 flex items-center justify-center overflow-hidden"
                    >
                        <AnimatePresence mode="popLayout">
                            {current ? (
                                <motion.img
                                    key={current.id}
                                    src={current.image}
                                    alt={current.name}
                                    initial={{ opacity: 0, scale: 1.08 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                    className="absolute inset-0 w-full h-full object-cover object-top"
                                />
                            ) : (
                                <div className="text-white/70 font-script text-2xl text-center px-8">Add your first piece</div>
                            )}
                        </AnimatePresence>
                        {current && (
                            <div className="absolute inset-x-0 bottom-0 pt-16 pb-5 lg:hidden bg-gradient-to-t from-black/40 to-transparent text-center">
                                <p className="font-script text-2xl text-white drop-shadow">{current.name}</p>
                            </div>
                        )}
                    </Link>
                </div>

                <div className="order-1 lg:order-none max-w-7xl mx-auto w-full px-6 md:px-12 relative z-10 grid lg:grid-cols-2">
                    <div className="flex flex-col justify-center items-center lg:items-start text-center lg:text-left text-white pt-16 lg:pt-20 pb-10 lg:pb-0">
                        <p className="font-sans text-xs tracking-[0.2em] uppercase mb-2 opacity-80">
                            {firstName ? `Hey ${firstName}, here's the vibe` : "Here's the Vibe"}
                        </p>
                        <h1 className="font-sans text-5xl md:text-6xl font-medium uppercase leading-tight mb-4">
                            Your Profile<br />Style Hub
                        </h1>
                        <p className="text-xs uppercase tracking-widest text-white/80 mb-6">
                            {items.length} pieces · {favorites.length} favorites
                        </p>
                        <Link
                            to="/create"
                            className="inline-flex items-center gap-2 border border-white px-6 py-3 uppercase text-xs tracking-widest hover:bg-white hover:text-charcoal transition"
                        >
                            <Sparkles size={14} /> Manifest the Fit
                        </Link>
                    </div>
                </div>
            </header>

            {/* Wardrobe Section */}
            <main className="w-full bg-[#A3B19C] text-white py-16 flex-grow">
                <div className="max-w-7xl mx-auto px-6 md:px-12">

                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-8">
                        <h2 className="text-xl font-sans uppercase tracking-widest text-center md:text-left text-white">Your Wardrobe</h2>
                        {items.length > GRID_LIMIT && (
                            <Link to="/collections" className="text-xs uppercase tracking-widest text-white/80 hover:text-white inline-flex items-center gap-1 self-center md:self-auto">
                                View all {items.length} <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>

                    {/* Guided first upload: shown until the basics for a full outfit are in */}
                    {stepsDone < STARTER_STEPS.length && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="border border-dashed border-white/60 p-6 md:p-8 mb-12 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10"
                        >
                            <div className="lg:w-1/3">
                                <p className="font-script text-3xl md:text-4xl mb-2">{items.length ? 'Almost there' : 'Build your closet'}</p>
                                <p className="text-xs uppercase tracking-widest text-white/80">
                                    Add one photo per piece. Your stylist needs these to manifest a full look.
                                </p>
                            </div>
                            <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                                {STARTER_STEPS.map((step, i) => {
                                    const done = step.done(categories);
                                    return (
                                        <li key={step.label}>
                                            <Link
                                                to="/wardrobe/new"
                                                className={`h-full flex flex-col items-center justify-center gap-2 p-4 text-center border transition ${done ? 'bg-white text-charcoal border-white' : 'border-white/40 hover:border-white hover:bg-white/10'}`}
                                            >
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-sage-green text-white' : 'border border-white/60'}`}>
                                                    {done ? <Check size={16} /> : <span className="text-xs">{i + 1}</span>}
                                                </span>
                                                <span className="text-xs uppercase tracking-widest">{step.label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ol>
                            <Link to="/wardrobe/new" className="bg-white text-charcoal px-6 py-3 uppercase text-xs tracking-widest hover:bg-gray-100 transition inline-flex items-center justify-center gap-2 shrink-0">
                                <Plus size={14} /> Add a Piece
                            </Link>
                        </motion.div>
                    )}

                    {newest.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                            {newest.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: (index % 4) * 0.08, duration: 0.5 }}
                                >
                                    <WardrobeCard item={item} />
                                </motion.div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-center md:justify-end mb-10">
                        <Link to="/wardrobe/new" className="bg-charcoal text-white border border-charcoal px-6 py-3 uppercase text-xs tracking-widest hover:bg-black transition">
                            Add to Wardrobe
                        </Link>
                    </div>
                </div>

            </main>

            <Footer />
        </div>
    );
};

export default Dashboard;
