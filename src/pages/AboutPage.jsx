import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Heart } from 'lucide-react';

// Marketing page for new visitors: the original "Profile Style Hub" design,
// filled with the project's own photos. Every action leads to sign-up.
const SHOWCASE = [
    { src: '/hero/outfits1.png', name: 'Teal Embroidered Kurti', price: 85 },
    { src: '/reimagined/outfits2.png', name: 'Forest Green Sweater', price: 70 },
    { src: '/featured/style1.png', name: 'Tiered Maxi Skirt', price: 55 },
    { src: '/reimagined/outfits1.png', name: 'Bow-Detail Jeans', price: 60 },
];

const AboutPage = () => {
    return (
        <div className="bg-off-white min-h-screen flex flex-col font-sans text-charcoal">
            <Navbar />

            {/* Hero Section */}
            <header className="relative bg-[#A3B19C] min-h-[400px] flex flex-col lg:flex-row lg:items-center overflow-hidden">
                {/* Phone/tablet: arch sits below the heading. Desktop: arch floats on the right, aligned to the content column */}
                <div className="order-2 lg:order-none relative lg:absolute lg:bottom-0 lg:top-10 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-7xl flex justify-center lg:justify-end lg:pr-20 xl:pr-40">
                    <motion.div
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        className="bg-[#B5C1AE] w-[260px] h-[300px] md:w-[340px] md:h-[400px] lg:w-[400px] lg:h-[500px] rounded-t-full relative lg:translate-y-20 flex items-center justify-center overflow-hidden"
                    >
                        <img src="/hero/outfits2.png" alt="A styled outfit" className="absolute inset-0 w-full h-full object-cover object-top" />
                    </motion.div>
                </div>

                <div className="order-1 lg:order-none max-w-7xl mx-auto w-full px-6 md:px-12 relative z-10 grid lg:grid-cols-2">
                    <div className="flex flex-col justify-center text-center lg:text-left text-white pt-16 lg:pt-20 pb-10 lg:pb-0">
                        <p className="font-sans text-xs tracking-[0.2em] uppercase mb-2 opacity-80">Here's the Vibe</p>
                        <h1 className="font-sans text-5xl md:text-6xl font-medium uppercase leading-tight mb-4">
                            Your Profile<br />Style Hub
                        </h1>
                    </div>
                </div>
            </header>

            {/* Wardrobe Section */}
            <main className="w-full bg-[#A3B19C] text-white py-16 flex-grow">
                <div className="max-w-7xl mx-auto px-6 md:px-12">

                    <h2 className="text-xl font-sans mb-8 uppercase tracking-widest text-center md:text-left text-white">Your Wardrobe</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                        {SHOWCASE.map((item, index) => (
                            <motion.div
                                key={item.name}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.6 }}
                            >
                                <Link to="/signup" className="group block">
                                    <div className="aspect-[3/4] bg-white/10 mb-3 relative overflow-hidden flex items-center justify-center border border-white/20">
                                        <img src={item.src} alt={item.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

                                        <div className="absolute top-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            <div className="bg-white p-1.5 rounded-full shadow-sm cursor-pointer hover:text-red-500 text-charcoal" aria-label="Sign up to save favorites">
                                                <Heart size={16} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-script text-lg">{item.name}</p>
                                        <p className="text-xs text-white/70 font-sans tracking-wide">$ {item.price.toFixed(2)}</p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-end gap-3 mb-10">
                        <Link to="/signup" className="bg-white text-charcoal border border-white px-6 py-3 uppercase text-xs tracking-widest hover:bg-gray-100 transition">Add to Bag</Link>
                        <Link to="/signup" className="bg-charcoal text-white border border-charcoal px-6 py-3 uppercase text-xs tracking-widest hover:bg-black transition">Add Bag</Link>
                    </div>
                </div>

            </main>

            <Footer />
        </div>
    );
};

export default AboutPage;
