import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Footer from '../components/Footer';
import { Shirt, Layers, User, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const CategoryCard = ({ title, icon: Icon, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        className="bg-sage-green/80 hover:bg-sage-green aspect-square flex flex-col items-center justify-center text-off-white p-6 cursor-pointer transition-colors shadow-md border-2 border-off-white/20 group"
    >
        <div className="p-4 border border-off-white/40 rounded bg-sage-green group-hover:bg-off-white/10 transition-colors">
            <Icon className="w-8 h-8 md:w-10 md:h-10 text-off-white" strokeWidth={1.5} />
        </div>
        <span className="mt-4 font-sans tracking-widest uppercase text-sm md:text-base font-medium">{title}</span>
    </motion.div>
);

const LandingPage = () => {
    return (
        <div className="bg-off-white min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
                <Hero />

                {/* Category Grid */}
                <section className="py-16 px-6 md:px-12 bg-off-white">
                    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                        <CategoryCard title="New In" icon={Shirt} delay={0.1} />
                        <CategoryCard title="Collections" icon={Layers} delay={0.2} />
                        <CategoryCard title="Your Style" icon={User} delay={0.3} />
                        <CategoryCard title="Favorites" icon={Star} delay={0.4} />
                    </div>
                </section>

                {/* Perfect Look Banner */}
                <section className="w-full bg-sage-green/10 py-16 md:py-24 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-12 relative z-10">
                        <div className="text-center md:text-left">
                            <p className="text-sm font-sans uppercase tracking-widest text-charcoal/60 mb-2">find the</p>
                            <h2 className="text-4xl md:text-6xl text-charcoal font-sans font-medium uppercase tracking-wide">
                                Perfect Look
                            </h2>
                            <p className="font-script text-3xl md:text-5xl text-sage-green mt-[-10px] ml-4 md:ml-12 transform rotate-[-2deg]">
                                to celebrate a special moment
                            </p>
                            <div className="w-16 h-px bg-charcoal/20 mt-8 mx-auto md:mx-0"></div>
                        </div>

                        {/* Arched Image Placeholder */}
                        <div className="relative w-64 h-80 md:w-80 md:h-96 rounded-t-[10rem] overflow-hidden border-4 border-white shadow-xl">
                            <div className="absolute inset-0 bg-charcoal/10 flex items-center justify-center text-charcoal/40 font-script text-xl">
                                Wardrobe Image
                            </div>
                        </div>

                        {/* Decorative Leaves (CSS only representation) */}
                        <div className="absolute right-0 bottom-0 text-white/40 pointer-events-none">
                            {/* In a real scenario, this would be an SVG or image asset */}
                            <div className="text-[10rem] leading-none opacity-50">🌿</div>
                        </div>
                    </div>
                </section>

                {/* Featured Styles */}
                <section className="py-20 px-6 md:px-12 bg-off-white">
                    <div className="max-w-7xl mx-auto">
                        <h3 className="text-center font-sans uppercase tracking-widest text-sm text-gray-400 mb-12">Featured Styles</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item} className="group cursor-pointer">
                                    <div className="bg-gray-100 aspect-[3/4] mb-4 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors"></div>
                                        {/* Placeholder Content */}
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-300 font-sans text-xs uppercase">
                                            Product {item}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-script text-lg text-charcoal">Effortless Chic</h4>
                                        <p className="text-xs font-sans text-gray-500 mt-1 uppercase tracking-wider">$86.00</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Instructional Section */}
                <section className="py-20 bg-white text-charcoal border-t border-gray-100">
                    <div className="max-w-6xl mx-auto px-6 text-center">
                        <h2 className="font-script text-5xl mb-12 text-sage-green">How to I & O</h2>
                        <div className="grid md:grid-cols-3 gap-12">
                            <div className="flex flex-col items-center">
                                <span className="text-6xl font-script text-sage-green/40 mb-4">1</span>
                                <h3 className="text-xl font-bold uppercase tracking-wide mb-2">Digitize</h3>
                                <p className="text-sm opacity-80 max-w-xs">Upload your wardrobe and let our AI organize your closet inventory.</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-6xl font-script text-sage-green/40 mb-4">2</span>
                                <h3 className="text-xl font-bold uppercase tracking-wide mb-2">Set the Vibe</h3>
                                <p className="text-sm opacity-80 max-w-xs">Tell us the event or mood. "Brunch with girls" or "Corporate Chic".</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-6xl font-script text-sage-green/40 mb-4">3</span>
                                <h3 className="text-xl font-bold uppercase tracking-wide mb-2">Manifest the Fit</h3>
                                <p className="text-sm opacity-80 max-w-xs">Get AI-curated outfits instantly and shop your own closet.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            {/* <Footer /> */}
            <Footer />
        </div>
    );
};

export default LandingPage;
