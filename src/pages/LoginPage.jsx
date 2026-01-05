import React from 'react';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const LoginPage = () => {
    return (
        <div className="min-h-screen bg-sage-green flex items-center justify-center p-4">
            <Link to="/" className="absolute top-8 left-8 text-off-white hover:text-charcoal transition-colors">
                <Home className="w-6 h-6" />
            </Link>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-off-white p-8 rounded-lg shadow-2xl max-w-md w-full text-center"
            >
                <h1 className="font-script text-4xl text-charcoal mb-4">Welcome Back</h1>
                <p className="text-sm uppercase tracking-widest text-gray-500 mb-8">Login to your Wardrobe</p>

                <form className="flex flex-col gap-4">
                    <input type="email" placeholder="Email" className="p-3 bg-gray-100 rounded border border-transparent focus:border-sage-green outline-none" />
                    <input type="password" placeholder="Password" className="p-3 bg-gray-100 rounded border border-transparent focus:border-sage-green outline-none" />

                    <Link to="/dashboard" className="mt-4 bg-charcoal text-off-white py-3 rounded uppercase tracking-wide font-bold hover:bg-sage-green transition-colors">
                        Login
                    </Link>
                </form>

                <p className="mt-6 text-xs text-gray-400">Don't have an account? <span className="text-sage-green font-bold cursor-pointer">Sign Up</span></p>
            </motion.div>
        </div>
    );
};

export default LoginPage;
