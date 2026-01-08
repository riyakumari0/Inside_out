import React from 'react';
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
                    <a href="#" className="hover:text-sage-light transition-colors">Home</a>
                    <a href="#" className="hover:text-sage-light transition-colors">New In</a>
                    <a href="#" className="hover:text-sage-light transition-colors">Lets Create</a>
                    <a href="#" className="hover:text-sage-light transition-colors">About</a>
                    <a href="#" className="hover:text-sage-light transition-colors">Contact</a>
                </div>

                {/* Socials */}
                <div className="flex gap-6">
                    <Instagram className="w-5 h-5 text-off-white/70 hover:text-white cursor-pointer transition-colors" />
                    <Facebook className="w-5 h-5 text-off-white/70 hover:text-white cursor-pointer transition-colors" />
                    <Twitter className="w-5 h-5 text-off-white/70 hover:text-white cursor-pointer transition-colors" />
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-off-white/10 flex flex-col md:flex-row justify-center md:justify-between items-center text-xs text-off-white/40 uppercase tracking-widest">
                <p>&copy; 2024 Inside & Out. All rights reserved.</p>
                <p className="flex items-center gap-1 mt-2 md:mt-0">Made with <Heart className="w-3 h-3 text-sage-light fill-current" /> by Gemini</p>
            </div>
        </footer>
    );
};

export default Footer;
