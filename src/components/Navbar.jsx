import React from 'react';
import { Search } from 'lucide-react';
const Navbar = () => {
    return (
        <nav className="w-full bg-white py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm font-sans">
            {/* Left: Logo */}
            <div className="flex flex-col">
                <h1 className="font-script text-2xl md:text-3xl text-charcoal tracking-wide cursor-pointer">
                    Inside & Out
                </h1>
                <p className="text-[0.5rem] tracking-widest uppercase text-gray-400">
                    From your wardrobe to the world
                </p>
            </div>

            {/* Center: Navigation Links */}
            <div className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest uppercase text-charcoal/80">
                <a href="#" className="hover:text-sage-green transition-colors">Home</a>
                <a href="#" className="hover:text-sage-green transition-colors">Favorites</a>
                <a href="#" className="hover:text-sage-green transition-colors">Create</a>
                <a href="#" className="hover:text-sage-green transition-colors">Credit</a>
            </div>

            {/* Right: Search & Profile */}
            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                    <input
                        type="text"
                        placeholder="Search"
                        className="pl-8 pr-4 py-1.5 rounded-full bg-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-sage-green w-48 text-gray-600 placeholder-gray-400"
                    />
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>

                {/* Profile Avatar Placeholder */}
                <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden cursor-pointer border border-gray-200">
                    <img
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=60" // Placeholder from splash
                        alt="Profile"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
