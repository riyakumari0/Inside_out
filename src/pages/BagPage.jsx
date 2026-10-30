import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, ShoppingBag, Trash2 } from 'lucide-react';
import PageShell from '../components/PageShell';
import useWardrobe from '../hooks/useWardrobe';
import useToast from '../hooks/useToast';
import { secondaryButton } from '../utils/styles';

// Products saved from "Shop the gap". Buying happens on the store's own site.
const BagPage = () => {
    const { bag, removeFromBag, getLook } = useWardrobe();
    const { showToast } = useToast();

    return (
        <PageShell eyebrow="Pieces to complete your looks" title="Your Bag">
            {bag.length ? (
                <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {bag.map(product => {
                            const look = product.lookId ? getLook(product.lookId) : null;
                            return (
                                <motion.div key={product.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white text-charcoal flex flex-col relative min-w-0">
                                    <a href={product.link} target="_blank" rel="noopener noreferrer sponsored" className="group flex flex-col flex-1">
                                        <div className="aspect-square bg-off-white overflow-hidden flex items-center justify-center">
                                            {product.thumbnail
                                                ? <img src={product.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                                : <ShoppingBag size={32} strokeWidth={1} className="text-gray-300" />}
                                        </div>
                                        <div className="p-3 flex flex-col gap-1 flex-1">
                                            <p className="text-xs leading-snug line-clamp-2">{product.title}</p>
                                            {look && <p className="font-script text-base text-sage-dark truncate">for {look.name}</p>}
                                            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                                                <span className="text-sm font-bold">{product.price}</span>
                                                <span className="text-[0.6rem] uppercase tracking-widest text-gray-500 truncate flex items-center gap-1">
                                                    {product.source} <ExternalLink size={10} />
                                                </span>
                                            </div>
                                        </div>
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => removeFromBag(product.id).then(() => showToast('Removed from your bag')).catch(err => showToast(err.message))}
                                        aria-label={`Remove ${product.title} from bag`}
                                        className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow hover:text-red-500"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            ) : (
                <div className="border border-dashed border-white/50 py-20 px-6 text-center">
                    <ShoppingBag size={40} strokeWidth={1.25} className="mx-auto mb-6 text-white/80" />
                    <p className="font-script text-3xl mb-2">Your bag is empty</p>
                    <p className="text-xs uppercase tracking-widest text-white/70 mb-8">Finalize a look, then save the pieces your stylist suggests</p>
                    <Link to="/create" className={secondaryButton}>Manifest a Look</Link>
                </div>
            )}
        </PageShell>
    );
};

export default BagPage;
