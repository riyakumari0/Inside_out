import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import PageShell from '../components/PageShell';
import { secondaryButton } from '../utils/styles';
import WardrobeCard from '../components/WardrobeCard';
import useWardrobe from '../hooks/useWardrobe';

const FavoritesPage = () => {
    const { favorites } = useWardrobe();

    return (
        <PageShell eyebrow="The pieces you love" title="Your Favorites">
            {favorites.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                    {favorites.map((item, index) => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <WardrobeCard item={item} />
                        </motion.div>
                    ))}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-dashed border-white/50 py-20 px-6 text-center"
                >
                    <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        className="inline-block mb-6"
                    >
                        <Heart size={40} strokeWidth={1.25} className="text-white/80" />
                    </motion.div>
                    <p className="font-script text-3xl mb-2">Nothing here yet</p>
                    <p className="text-xs uppercase tracking-widest text-white/70 mb-8">
                        Tap the heart on any piece in your wardrobe to save it here
                    </p>
                    <Link to="/dashboard" className={secondaryButton}>Browse Wardrobe</Link>
                </motion.div>
            )}
        </PageShell>
    );
};

export default FavoritesPage;
