// Outfits are built by the Django stylist API (/api/stylist/outfit/); this only labels the season in the UI
export const currentSeason = (date = new Date()) => {
    const month = date.getMonth();
    if (month <= 1 || month === 11) return 'winter';
    if (month <= 4) return 'spring';
    if (month <= 7) return 'summer';
    return 'autumn';
};
