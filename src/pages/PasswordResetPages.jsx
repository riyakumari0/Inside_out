import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { api } from '../api/client';
import useToast from '../hooks/useToast';

const inputClass = 'w-full p-3 bg-gray-100 rounded border border-transparent focus:border-sage-green outline-none';
const submitClass = 'mt-4 bg-charcoal text-off-white py-3 rounded uppercase tracking-wide font-bold hover:bg-sage-green transition-colors disabled:opacity-60';

// Same card as the login page
const Card = ({ title, subtitle, children }) => (
    <div className="min-h-screen bg-sage-green flex items-center justify-center px-4 py-20">
        <Link to="/" aria-label="Back to home" className="absolute top-8 left-8 text-off-white hover:text-charcoal transition-colors">
            <Home className="w-6 h-6" />
        </Link>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-off-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full text-center">
            <h1 className="font-script text-4xl text-charcoal mb-4">{title}</h1>
            <p className="text-sm uppercase tracking-widest text-gray-500 mb-8">{subtitle}</p>
            {children}
            <p className="mt-6 text-xs text-gray-400">
                Remembered it? <Link to="/login" className="text-sage-green font-bold hover:underline">Log In</Link>
            </p>
        </motion.div>
    </div>
);

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email.');
        setError('');
        setIsSending(true);
        try {
            await api('/auth/password-reset/', { method: 'POST', body: { email } });
            setSent(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Card title="Forgot it?" subtitle="We'll email you a reset link">
            {sent ? (
                <p className="text-sm text-charcoal" role="status">If an account exists for {email}, a reset link is on its way. Check your inbox.</p>
            ) : (
                <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                    <label htmlFor="email" className="sr-only">Email</label>
                    <input id="email" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                    {error && <p className="text-sm text-red-500 text-left" role="alert">{error}</p>}
                    <button type="submit" disabled={isSending} className={submitClass}>{isSending ? 'One moment…' : 'Send Reset Link'}</button>
                </form>
            )}
        </Card>
    );
};

export const ResetPasswordPage = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 8) return setError('Password must be at least 8 characters.');
        setError('');
        setIsSaving(true);
        try {
            await api('/auth/password-reset/confirm/', {
                method: 'POST',
                body: { uid: params.get('uid'), token: params.get('token'), password },
            });
            showToast('Password updated. Please log in.');
            navigate('/login', { replace: true });
        } catch (err) {
            setError(err.message);
            setIsSaving(false);
        }
    };

    return (
        <Card title="New Password" subtitle="Choose a strong one">
            <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
                <label htmlFor="password" className="sr-only">New password</label>
                <input id="password" type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
                {error && <p className="text-sm text-red-500 text-left" role="alert">{error}</p>}
                <button type="submit" disabled={isSaving} className={submitClass}>{isSaving ? 'One moment…' : 'Update Password'}</button>
            </form>
        </Card>
    );
};
