import React from 'react';
import { Search, Home, Heart, ShoppingBag } from 'lucide-react';

const LandingNavbar = () => {
    return (
        <nav className="w-full bg-off-white py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm">
            {/* Left: Search (Hidden on mobile originally, but good to have) or just spacing */}
            <div className="hidden md:block w-1/3">
                <Search className="text-charcoal w-5 h-5 cursor-pointer hover:text-sage-green transition-colors" />
            </div>

            {/* Center: Logo */}
            <div className="w-1/3 text-center">
                <h1 className="font-script text-3xl md:text-5xl text-charcoal tracking-wide cursor-pointer">
                    Inside & Out
                </h1>
                <p className="text-[0.6rem] md:text-xs tracking-widest uppercase mt-1 text-gray-500">
                    From your wardrobe to the world
                </p>
            </div>

            {/* Right: Icons */}
            <div className="w-1/3 flex justify-end gap-6 items-center">
                <Home className="text-charcoal w-5 h-5 cursor-pointer hover:text-sage-green transition-colors hidden md:block" />
                <Heart className="text-charcoal w-5 h-5 cursor-pointer hover:text-sage-green transition-colors" />
                <ShoppingBag className="text-charcoal w-5 h-5 cursor-pointer hover:text-sage-green transition-colors" />
            </div>

            {/* Mobile Menu Icon (Hamburger) could go here */}
        </nav>
    );
};

export default LandingNavbar;
