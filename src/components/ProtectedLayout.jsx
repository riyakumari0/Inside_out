import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import useWardrobe from '../hooks/useWardrobe';
import Chatbot from './Chatbot';

const Loading = ({ message }) => (
    <div className="min-h-screen bg-[#A3B19C] text-white flex flex-col items-center justify-center gap-4">
        <motion.div
            className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        />
        <p className="font-script text-2xl">{message}</p>
    </div>
);

// Logged-in pages: sends visitors to /login first, then back to where they were going
const ProtectedLayout = () => {
    const { user, isLoading } = useAuth();
    const { isLoading: isWardrobeLoading, loadError } = useWardrobe();
    const location = useLocation();

    if (isLoading) return <Loading message="One moment…" />;
    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }
    if (isWardrobeLoading) return <Loading message="Opening your closet…" />;
    if (loadError) return <Loading message={loadError} />;

    return (
        <>
            <Outlet />
            <Chatbot />
        </>
    );
};

export default ProtectedLayout;
