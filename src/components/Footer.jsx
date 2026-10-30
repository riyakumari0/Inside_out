import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Heart } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-sage-dark text-off-white py-16 px-6 border-t border-off-white/10">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-12">

                {/* Brand Section */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <h2 className="font-script text-4xl mb-2">Inside & Out</h2>
                    <p className="text-xs tracking-widest uppercase text-off-white/60">From your wardrobe to the world</p>
                </div>

                {/* Links */}
                <div className="flex flex-wrap justify-center gap-8 md:gap-12 font-sans text-sm tracking-wide uppercase">
                    <Link to="/" className="hover:text-sage-light transition-colors">Home</Link>
                    <Link to="/collections?view=new" className="hover:text-sage-light transition-colors">New In</Link>
                    <Link to="/create" className="hover:text-sage-light transition-colors">Lets Create</Link>
                    <Link to="/about" className="hover:text-sage-light transition-colors">About</Link>
                    <Link to="/contact" className="hover:text-sage-light transition-colors">Contact</Link>
                </div>

                {/* Socials */}
                <div className="flex gap-6">
                    {/* TODO: replace with your own profile URLs */}
                    {[
                        { href: 'https://instagram.com', label: 'Instagram', Icon: Instagram },
                        { href: 'https://facebook.com', label: 'Facebook', Icon: Facebook },
                        { href: 'https://x.com', label: 'X (Twitter)', Icon: Twitter },
                    ].map(({ href, label, Icon }) => (
                        <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="hover:-translate-y-0.5 transition-transform">
                            <Icon className="w-5 h-5 text-off-white/70 hover:text-white cursor-pointer transition-colors" />
                        </a>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-off-white/10 flex flex-col md:flex-row justify-center md:justify-between items-center text-xs text-off-white/40 uppercase tracking-widest">
                <p>&copy; {new Date().getFullYear()} Inside & Out. All rights reserved.</p>
                <p className="flex items-center gap-1 mt-2 md:mt-0">Made with <Heart className="w-3 h-3 text-sage-light fill-current" /> by Inside &amp; Out</p>
            </div>
        </footer>
    );
};

export default Footer;
