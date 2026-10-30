import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Eye, EyeOff } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const inputClass = 'w-full p-3 bg-gray-100 rounded border border-transparent focus:border-sage-green outline-none';

const LoginPage = ({ mode = 'login' }) => {
    const isSignUp = mode === 'signup';
    const { user, isLoading, logIn, signUp } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = location.state?.from ?? '/dashboard';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isLoading && user) return <Navigate to={redirectTo} replace />;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (isSignUp && !name.trim()) return setError('Please tell us your name.');
        if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email.');
        if (isSignUp && password.length < 8) return setError('Password must be at least 8 characters.');
        if (!password) return setError('Please enter your password.');

        setIsSubmitting(true);
        try {
            if (isSignUp) await signUp({ name, email, password });
            else await logIn({ email, password });
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-sage-green flex items-center justify-center px-4 py-20">
            <Link to="/" aria-label="Back to home" className="absolute top-8 left-8 text-off-white hover:text-charcoal transition-colors">
                <Home className="w-6 h-6" />
            </Link>

            <motion.div
                key={mode}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-off-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full text-center"
            >
                <h1 className="font-script text-4xl text-charcoal mb-4">{isSignUp ? 'Welcome In' : 'Welcome Back'}</h1>
                <p className="text-sm uppercase tracking-widest text-gray-500 mb-8">
                    {isSignUp ? 'Create your wardrobe' : 'Login to your Wardrobe'}
                </p>

                <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                    <AnimatePresence initial={false}>
                        {isSignUp && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                                <label htmlFor="name" className="sr-only">Name</label>
                                <input id="name" type="text" autoComplete="name" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <label htmlFor="email" className="sr-only">Email</label>
                    <input id="email" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />

                    <div className="relative">
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${inputClass} pr-11`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-sage-green"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {!isSignUp && (
                        <Link to="/forgot-password" className="text-xs text-sage-green font-bold text-right hover:underline -mt-2">
                            Forgot password?
                        </Link>
                    )}

                    {error && (
                        <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-red-500 text-left" role="alert">
                            {error}
                        </motion.p>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="mt-4 bg-charcoal text-off-white py-3 rounded uppercase tracking-wide font-bold hover:bg-sage-green transition-colors disabled:opacity-60"
                    >
                        {isSubmitting ? 'One moment…' : isSignUp ? 'Sign Up' : 'Login'}
                    </button>
                </form>

                <p className="mt-6 text-xs text-gray-400">
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <Link to={isSignUp ? '/login' : '/signup'} state={location.state} className="text-sage-green font-bold cursor-pointer hover:underline">
                        {isSignUp ? 'Log In' : 'Sign Up'}
                    </Link>
                </p>
            </motion.div>
        </div>
    );
};

export default LoginPage;
