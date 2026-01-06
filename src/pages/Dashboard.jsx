import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Edit, Heart, Search } from 'lucide-react';

const Dashboard = () => {
    // TODO: Implement dynamic image loading based on user gender (male/female).
    // The images for the Hero section and Wardrobe items should be selected 
    // based on whether the user is male or female.
    // Currently using placeholders as requested.

    return (
        <div className="bg-off-white min-h-screen flex flex-col font-sans text-charcoal">
            <Navbar />

            {/* Hero Section */}
            <header className="relative bg-[#A3B19C] min-h-[400px] flex items-center overflow-hidden">
                <div className="absolute inset-x-0 bottom-0 top-10 flex justify-end pr-20 md:pr-40">
                    <div className="bg-[#B5C1AE] w-[400px] h-[500px] rounded-t-full relative translate-y-20 flex items-center justify-center">
                        {/* Dynamic Image Placeholder */}
                        {/* TODO: Insert dynamic Hero image here based on user.gender */}
                        <div className="text-white/50 font-script text-2xl">User Style Image</div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto w-full px-6 md:px-12 relative z-10 grid md:grid-cols-2">
                    <div className="flex flex-col justify-center text-white pt-20 pb-20 md:pb-0">
                        <p className="font-sans text-xs tracking-[0.2em] uppercase mb-2 opacity-80">Here's the Vibe</p>
                        <h1 className="font-sans text-5xl md:text-6xl font-medium uppercase leading-tight mb-4">
                            Your Profile<br />Style Hub
                        </h1>
                    </div>
                </div>
            </header>

            {/* Wardrobe Section (Refactored to be full width) */}
            {/* Using bg-[#A3B19C] to match Hero background as requested */}
            <main className="w-full bg-[#A3B19C] text-white py-16 flex-grow">
                <div className="max-w-7xl mx-auto px-6 md:px-12">

                    <h2 className="text-xl font-sans mb-8 uppercase tracking-widest text-center md:text-left text-white">Your Wardrobe</h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                        {/* Item 1 */}
                        <div className="group">
                            <div className="aspect-[3/4] bg-white/10 mb-3 relative overflow-hidden flex items-center justify-center border border-white/20">
                                {/* Placeholder */}
                                <span className="text-white/70 text-xs uppercase">Dynamic Item 1</span>

                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white p-1.5 rounded-full shadow-sm cursor-pointer hover:text-red-500 text-charcoal">
                                        <Heart size={16} />
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-script text-lg">Basic Tee Bundle</p>
                                <p className="text-xs text-white/70 font-sans tracking-wide">$ 39.00</p>
                            </div>
                        </div>

                        {/* Item 2 */}
                        <div className="group">
                            <div className="aspect-[3/4] bg-white/10 mb-3 relative overflow-hidden flex items-center justify-center border border-white/20">
                                {/* Placeholder */}
                                <span className="text-white/70 text-xs uppercase">Dynamic Item 2</span>

                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white p-1.5 rounded-full shadow-sm cursor-pointer hover:text-red-500 text-charcoal">
                                        <Heart size={16} />
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-script text-lg">Utility Jacket</p>
                                <p className="text-xs text-white/70 font-sans tracking-wide">$ 115.00</p>
                            </div>
                        </div>

                        {/* Item 3 */}
                        <div className="group">
                            <div className="aspect-[3/4] bg-white/10 mb-3 relative overflow-hidden flex items-center justify-center border border-white/20">
                                <div className="text-center p-4">
                                    <span className="text-white/70 text-xs uppercase">Dynamic Item 3</span>
                                </div>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white p-1.5 rounded-full shadow-sm cursor-pointer hover:text-red-500 text-charcoal">
                                        <Heart size={16} />
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-script text-lg">Evening Elegance</p>
                                <p className="text-xs text-white/70 font-sans tracking-wide">$ 90.00</p>
                            </div>
                        </div>

                        {/* Item 4 */}
                        <div className="group">
                            <div className="aspect-[3/4] bg-white/10 mb-3 relative overflow-hidden flex items-center justify-center border border-white/20">
                                <div className="text-center p-4">
                                    <span className="text-white/70 text-xs uppercase">Dynamic Item 4</span>
                                </div>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-white p-1.5 rounded-full shadow-sm cursor-pointer hover:text-red-500 text-charcoal">
                                        <Heart size={16} />
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-script text-lg">Comfy Cargos</p>
                                <p className="text-xs text-white/70 font-sans tracking-wide">$ 55.00</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mb-10">
                        <button className="bg-white text-charcoal border border-white px-6 py-3 uppercase text-xs tracking-widest hover:bg-gray-100 transition">Add to Bag</button>
                        <button className="bg-charcoal text-white border border-charcoal px-6 py-3 uppercase text-xs tracking-widest hover:bg-black transition">Add Bag</button>
                    </div>
                </div>

            </main>

            <Footer />
        </div>
    );
};

export default Dashboard;
