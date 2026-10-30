// Moods / occasions used for tagging pieces and generating outfits.
// Keep in sync with VIBES in backend/wardrobe/constants.py
export const VIBES = [
    { slug: 'date-night', label: 'Date Night' },
    { slug: 'corporate', label: 'Corporate Chic' },
    { slug: 'weekend', label: 'Weekend Vibes' },
    { slug: 'brunch', label: 'Brunch' },
    { slug: 'party', label: 'Party' },
    { slug: 'festive', label: 'Festive' },
    { slug: 'cozy', label: 'Cozy' },
    { slug: 'travel', label: 'Travel' },
    { slug: 'toddler', label: 'Toddler Edit' },
];

export const vibeLabel = (slug) => VIBES.find(v => v.slug === slug)?.label ?? slug;
