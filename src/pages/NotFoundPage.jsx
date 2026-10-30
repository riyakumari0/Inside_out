import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Branch } from '../components/Decorations';

const NotFoundPage = () => (
    <div className="min-h-screen bg-sage-green text-off-white flex flex-col items-center justify-center px-6 py-16 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 pointer-events-none">
            <Branch className="w-48 h-48 text-off-white/10" />
        </div>
        <div className="absolute bottom-0 right-0 pointer-events-none">
            <Branch className="w-64 h-64 text-off-white/10" flip />
        </div>

        <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-sans text-7xl md:text-9xl font-bold text-charcoal"
        >
            404
        </motion.p>
        <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="font-script text-4xl md:text-5xl mb-4"
        >
            Lost in the closet?
        </motion.p>
        <p className="text-sm uppercase tracking-widest text-off-white/80 mb-10">This page doesn't exist, but your style does.</p>
        <Link
            to="/"
            className="px-8 py-3 bg-off-white text-sage-green font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition uppercase tracking-wider"
        >
            Take Me Home
        </Link>
    </div>
);

export default NotFoundPage;
