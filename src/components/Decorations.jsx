import React from 'react';
import { motion } from 'framer-motion';

export const Leaf = ({ className, delay = 0, rotate = 0 }) => (
    <motion.svg
        initial={{ rotate: rotate - 5 }}
        animate={{ rotate: rotate + 5 }}
        transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: delay
        }}
        viewBox="0 0 24 24"
        className={`w-12 h-12 text-sage-dark/30 ${className}`}
        fill="currentColor"
    >
        <path d="M17.5,12.5c-0.5-2.5-2.5-4.5-5-5c-2.5-0.5-5,0.5-6.5,2.5c-1.5,2-2,5-1,7.5c1,2.5,3.5,4,6,4c2.5,0,5-2,6-5 C17.5,15,18,13.5,17.5,12.5z M12,18c-2,0-3.5-1.5-4-3.5c0-1,0.5-2,1.5-2.5c1-0.5,2.5,0,3.5,1c1,1,1,2.5,0.5,3.5 C13,17.5,12.5,18,12,18z" />
        <path d="M12,13c0.5,0.5,1,1.5,1,2.5s-0.5,2-1,2s-1-1.5-1-2.5S11.5,13.5,12,13z" opacity="0.5" />
    </motion.svg>
);

export const Flower = ({ className, delay = 0 }) => (
    <motion.svg
        animate={{ rotate: 360 }}
        transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
            delay: delay
        }}
        viewBox="0 0 24 24"
        className={`w-10 h-10 text-sage-light/60 ${className}`}
        fill="currentColor"
    >
        <path d="M12,2 C13,5 15,7 18,8 C15,9 13,11 12,14 C11,11 9,9 6,8 C9,7 11,5 12,2 Z" transform="rotate(0 12 8)" />
        <path d="M12,2 C13,5 15,7 18,8 C15,9 13,11 12,14 C11,11 9,9 6,8 C9,7 11,5 12,2 Z" transform="rotate(90 12 8) translate(4 4)" opacity="0.8" />
        <path d="M12,2 C13,5 15,7 18,8 C15,9 13,11 12,14 C11,11 9,9 6,8 C9,7 11,5 12,2 Z" transform="rotate(180 12 8) translate(0 8)" opacity="0.8" />
        <path d="M12,2 C13,5 15,7 18,8 C15,9 13,11 12,14 C11,11 9,9 6,8 C9,7 11,5 12,2 Z" transform="rotate(270 12 8) translate(-4 4)" opacity="0.8" />
        <circle cx="12" cy="12" r="2" fill="white" opacity="0.9" />
    </motion.svg>
);

export const Branch = ({ className, delay = 0, flip = false }) => (
    <motion.svg
        initial={{ rotate: flip ? 5 : -5 }}
        animate={{ rotate: flip ? -5 : 5 }}
        transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: delay
        }}
        viewBox="0 0 100 100"
        className={`w-32 h-32 text-sage-green/20 ${className}`}
        fill="currentColor"
        style={{ transform: flip ? 'scaleX(-1)' : 'none' }}
    >
        <path d="M50,100 C50,80 60,60 80,40 M50,80 C40,70 30,60 20,50 M60,70 C70,65 80,60 90,55 M40,90 C30,85 20,80 10,75" stroke="currentColor" strokeWidth="2" fill="none" />
        <circle cx="80" cy="40" r="5" />
        <circle cx="20" cy="50" r="4" />
        <circle cx="90" cy="55" r="3" />
        <circle cx="10" cy="75" r="3" />
    </motion.svg>
);
