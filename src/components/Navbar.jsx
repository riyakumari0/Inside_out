import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Menu, X, Shirt, Heart, Plus, Layers, LogOut, LogIn, ShoppingBag, UserRound, ShieldCheck, LifeBuoy } from 'lucide-react';
import useAuth from '../hooks/useAuth';

const SearchBox = ({ className, inputClassName, onDone }) => {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [query, setQuery] = useState(params.get('q') ?? '');

    return (
        <form
            role="search"
            className={`relative ${className}`}
            onSubmit={(e) => {
                e.preventDefault();
                navigate(query.trim() ? `/collections?q=${encodeURIComponent(query.trim())}` : '/collections');
                onDone?.();
            }}
        >
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search your wardrobe"
                className={`pl-8 pr-4 py-1.5 rounded-full bg-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-sage-green text-gray-600 placeholder-gray-400 ${inputClassName}`}
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </form>
    );
};

const Navbar = () => {
    const { user, logOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);

    const links = [
        { to: user ? '/dashboard' : '/', label: 'Home' },
        { to: '/favorites', label: 'Favorites' },
        { to: '/create', label: 'Create' },
    ];

    // Close the profile menu when clicking anywhere else
    useEffect(() => {
        if (!isProfileOpen) return;
        const close = (e) => {
            if (!profileRef.current?.contains(e.target)) setIsProfileOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [isProfileOpen]);

    const profileItems = [
        { to: '/profile', label: 'My Profile', icon: UserRound },
        { to: '/dashboard', label: 'My Wardrobe', icon: Shirt },
        { to: '/collections', label: 'Collections', icon: Layers },
        { to: '/favorites', label: 'Favorites', icon: Heart },
        { to: '/bag', label: 'My Bag', icon: ShoppingBag },
        { to: '/wardrobe/new', label: 'Add a Piece', icon: Plus },
        { to: '/support', label: 'Help & Support', icon: LifeBuoy },
        ...(user?.isAdmin ? [{ to: '/admin-panel', label: 'Admin Panel', icon: ShieldCheck }] : []),
    ];

    return (
        <nav className="w-full bg-white py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50 shadow-sm font-sans">
            {/* Left: Logo */}
            <Link to={user ? '/dashboard' : '/'} className="flex flex-col">
                <h1 className="font-script text-2xl md:text-3xl text-charcoal tracking-wide cursor-pointer">
                    Inside & Out
                </h1>
                <p className="text-[0.5rem] tracking-widest uppercase text-gray-400">
                    From your wardrobe to the world
                </p>
            </Link>

            {/* Center: Navigation Links */}
            <div className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest uppercase text-charcoal/80">
                {links.map(link => (
                    <Link key={link.label} to={link.to} className="hover:text-sage-green transition-colors">{link.label}</Link>
                ))}
            </div>

            {/* Right: Search & Profile */}
            <div className="flex items-center gap-4">
                <SearchBox key={location.search} className="hidden md:block" inputClassName="md:w-32 lg:w-48" />

                {/* Profile Avatar */}
                <div className="relative" ref={profileRef}>
                    <button
                        type="button"
                        onClick={() => (user ? setIsProfileOpen(!isProfileOpen) : navigate('/login'))}
                        aria-label={user ? 'Open profile menu' : 'Log in'}
                        aria-expanded={isProfileOpen}
                        className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden cursor-pointer border border-gray-200 block hover:ring-2 hover:ring-sage-green/50 transition"
                    >
                        {/* Logged in: your own photo or initials. Logged out: the original placeholder */}
                        {user && user.avatar && <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />}
                        {user && !user.avatar && (
                            <span className="w-full h-full flex items-center justify-center bg-sage-green text-off-white text-xs font-bold uppercase">
                                {user.name.trim().charAt(0)}
                            </span>
                        )}
                        {!user && (
                            <img
                                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=60"
                                alt="Log in"
                                className="w-full h-full object-cover"
                            />
                        )}
                    </button>

                    <AnimatePresence>
                        {isProfileOpen && user && (
                            <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="absolute right-0 mt-3 w-56 bg-white shadow-xl border border-gray-100 py-2 text-charcoal"
                            >
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="font-script text-xl leading-none">{user.name}</p>
                                    <p className="text-[0.65rem] text-gray-400 truncate mt-1">{user.email}</p>
                                </div>
                                {profileItems.map(({ to, label, icon: Icon }) => (
                                    <Link
                                        key={to}
                                        to={to}
                                        onClick={() => setIsProfileOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest hover:bg-off-white hover:text-sage-green transition-colors"
                                    >
                                        <Icon size={14} /> {label}
                                    </Link>
                                ))}
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setIsProfileOpen(false);
                                        await logOut();
                                        navigate('/');
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs uppercase tracking-widest hover:bg-off-white hover:text-red-500 transition-colors border-t border-gray-100 mt-1"
                                >
                                    <LogOut size={14} /> Log Out
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Mobile menu toggle */}
                <button
                    type="button"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden text-charcoal"
                    aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={isMenuOpen}
                >
                    {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden absolute top-full left-0 w-full bg-white shadow-md overflow-hidden text-xs font-bold tracking-widest uppercase text-charcoal/80"
                    >
                        <div className="px-6 py-4">
                            <SearchBox inputClassName="w-full" onDone={() => setIsMenuOpen(false)} />
                        </div>
                        {links.map(link => (
                            <Link
                                key={link.label}
                                to={link.to}
                                onClick={() => setIsMenuOpen(false)}
                                className="block px-6 py-4 border-t border-gray-100 hover:text-sage-green transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                        {!user && (
                            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 px-6 py-4 border-t border-gray-100 text-sage-green">
                                <LogIn size={14} /> Log In
                            </Link>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
