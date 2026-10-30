import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

// Common frame for the logged-in pages: same sage background and type as the dashboard
const PageShell = ({ eyebrow, title, back, actions, children, width = 'max-w-7xl' }) => (
    <div className="bg-off-white min-h-screen flex flex-col font-sans text-charcoal">
        <Navbar />

        <main className="w-full bg-[#A3B19C] text-white py-12 md:py-16 flex-grow">
            <div className={`${width} mx-auto px-6 md:px-12`}>
                {back && (
                    <Link to={back.to} className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/80 hover:text-white mb-8">
                        <ArrowLeft size={14} /> {back.label}
                    </Link>
                )}

                {(eyebrow || title) && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-12"
                    >
                        <div>
                            {eyebrow && <p className="font-sans text-xs tracking-[0.2em] uppercase mb-2 opacity-80">{eyebrow}</p>}
                            {title && <h1 className="font-sans text-4xl md:text-5xl font-medium uppercase leading-tight break-words">{title}</h1>}
                        </div>
                        {actions}
                    </motion.div>
                )}

                {children}
            </div>
        </main>

        <Footer />
    </div>
);

export const Pill = ({ active, onClick, children }) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`px-4 py-2 text-xs uppercase tracking-widest border transition ${active
            ? 'bg-white text-charcoal border-white'
            : 'bg-transparent text-white border-white/40 hover:border-white'
            }`}
    >
        {children}
    </button>
);

export default PageShell;
