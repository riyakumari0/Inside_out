import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Home, Heart, ShoppingBag } from 'lucide-react';

const iconClass = 'text-charcoal w-5 h-5 cursor-pointer hover:text-sage-green transition-colors';

const LandingNavbar = () => {
    return (
        <nav className="w-full bg-off-white py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm">
            {/* Left: Search (fixed width on mobile so the logo stays centred) */}
            <div className="w-16 md:w-1/3">
                <Link to="/collections" aria-label="Search your wardrobe" className="inline-block">
                    <Search className={iconClass} />
                </Link>
            </div>

            {/* Center: Logo */}
            <div className="flex-1 md:flex-none md:w-1/3 text-center min-w-0">
                <Link to="/" className="inline-block">
                    <h1 className="font-script text-3xl md:text-5xl text-charcoal tracking-wide cursor-pointer whitespace-nowrap">
                        Inside & Out
                    </h1>
                    <p className="hidden sm:block text-[0.6rem] md:text-xs tracking-widest uppercase mt-1 text-gray-500">
                        From your wardrobe to the world
                    </p>
                </Link>
            </div>

            {/* Right: Icons */}
            <div className="w-16 md:w-1/3 flex justify-end gap-4 md:gap-6 items-center">
                <Link to="/" aria-label="Home" className="hidden md:block">
                    <Home className={iconClass} />
                </Link>
                <Link to="/favorites" aria-label="Favorites">
                    <Heart className={iconClass} />
                </Link>
                <Link to="/bag" aria-label="Your bag">
                    <ShoppingBag className={iconClass} />
                </Link>
            </div>
        </nav>
    );
};

export default LandingNavbar;
