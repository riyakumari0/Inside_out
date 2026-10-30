import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Shirt } from 'lucide-react';
import useWardrobe from '../hooks/useWardrobe';
import useToast from '../hooks/useToast';

const WardrobeCard = ({ item }) => {
    const { toggleFavorite } = useWardrobe();
    const { showToast } = useToast();

    return (
        <Link to={`/wardrobe/${item.id}`} className="group block">
            <div className="aspect-[3/4] bg-white/10 mb-3 relative overflow-hidden flex items-center justify-center border border-white/20">
                {item.image ? (
                    <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                ) : (
                    <Shirt size={32} strokeWidth={1} className="text-white/60" />
                )}

                {/* Touch screens have no hover, so the heart is always shown there */}
                <div className={`absolute top-3 right-3 transition-opacity ${item.favorite ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(item.id)
                                .then(() => showToast(item.favorite ? 'Removed from favorites' : 'Added to favorites ♡'))
                                .catch(err => showToast(err.message));
                        }}
                        aria-label={item.favorite ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
                        aria-pressed={item.favorite}
                        className={`bg-white p-1.5 rounded-full shadow-sm cursor-pointer hover:text-red-500 flex active:scale-90 transition-transform ${item.favorite ? 'text-red-500' : 'text-charcoal'}`}
                    >
                        <Heart size={16} fill={item.favorite ? 'currentColor' : 'none'} />
                    </button>
                </div>

                {item.wornCount > 0 && (
                    <span className="absolute bottom-3 left-3 bg-white/90 text-charcoal text-[0.6rem] uppercase tracking-widest px-2 py-1">
                        Worn {item.wornCount}×
                    </span>
                )}
            </div>
            <div className="text-center">
                <p className="font-script text-lg">{item.name}</p>
                {item.price != null && (
                    <p className="text-xs text-white/70 font-sans tracking-wide">$ {item.price.toFixed(2)}</p>
                )}
            </div>
        </Link>
    );
};

export default WardrobeCard;
