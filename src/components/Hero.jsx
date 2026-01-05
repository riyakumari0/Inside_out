import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Hero = () => {
    return (
        <section className="w-full min-h-[90vh] flex flex-col md:flex-row bg-sage-green text-off-white overflow-hidden relative">
            {/* Texture Overlay (Optional, for depth) */}
            <div className="absolute inset-0 bg-black/5 pointer-events-none z-0"></div>

            {/* Left Content: Collage/Image Area */}
            <div className="w-full md:w-1/2 min-h-[50vh] md:min-h-full flex items-center justify-center p-8 z-10 relative">
                {/* Placeholder for Torn Paper Collage */}
                <div className="relative w-full max-w-md aspect-square bg-off-white/10 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-white/20 transform -rotate-2">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-dashed border-off-white/30 rounded-lg pointer-events-none"></div>
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <span className="font-script text-4xl mb-4">Inside & Out</span>
                        <p className="text-sm tracking-widest uppercase">Your Wardrobe Reimagined</p>
                        {/* This would be where the actual collage image goes */}
                        <div className="mt-8 grid grid-cols-2 gap-4 opacity-80">
                            <div className="bg-charcoal/20 w-24 h-32 rounded"></div>
                            <div className="bg-charcoal/20 w-24 h-32 rounded mt-8"></div>
                        </div>
                    </div>
                    {/* Torn paper visual effect can be added with CSS clip-paths or SVGs here */}
                </div>
            </div>

            {/* Right Content: Typography & CTA */}
            <div className="w-full md:w-1/2 flex flex-col justify-center items-center md:items-start p-8 md:pl-0 z-10 text-center md:text-left">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <p className="font-script text-3xl md:text-5xl mb-2 text-off-white/90">Set the Vibe</p>
                    <h1 className="font-sans text-5xl md:text-7xl font-bold uppercase tracking-tight leading-none mb-6 text-charcoal shadow-sm">
                        Manifest<br />The Fit
                    </h1>
                    <p className="font-sans text-lg md:text-xl text-off-white/80 max-w-md mb-8">
                        From your closet to the streets. Digitize your wardrobe, style with AI, and express your true self.
                    </p>

                    <Link to="/login">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-8 py-3 bg-off-white text-sage-green font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-all uppercase tracking-wider"
                        >
                            Login Now
                        </motion.button>
                    </Link>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
