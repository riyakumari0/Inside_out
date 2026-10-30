// Shape of a wardrobe item as returned by the API (/api/items/):
// {
//   id:        string (uuid)
//   name:      string
//   category:  one of CATEGORIES
//   image:     string | null   (/media/... URL)
//   colors:    string[]        (names from COLORS, main colour first)
//   tags:      string[]        (vibe slugs from VIBES, or free text)
//   seasons:   string[]        (from SEASONS)
//   pattern:   string
//   price:     number | null
//   favorite:  boolean
//   wornCount: number
//   lastWorn:  string | null   (ISO date)
//   createdAt: string          (ISO date)
// }
// Keep these lists in sync with backend/wardrobe/constants.py

export const CATEGORIES = ['top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory'];
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const COLORS = [
    { name: 'black', hex: '#1F1F1F' },
    { name: 'white', hex: '#F5F5F0' },
    { name: 'grey', hex: '#8E8E8E' },
    { name: 'beige', hex: '#D8C3A5' },
    { name: 'brown', hex: '#7A5230' },
    { name: 'red', hex: '#C0392B' },
    { name: 'pink', hex: '#E8A0B4' },
    { name: 'orange', hex: '#E67E22' },
    { name: 'yellow', hex: '#F1C40F' },
    { name: 'green', hex: '#556948' },
    { name: 'teal', hex: '#1F6F78' },
    { name: 'blue', hex: '#2E5C8A' },
    { name: 'navy', hex: '#1B2A49' },
    { name: 'purple', hex: '#7D5BA6' },
    { name: 'gold', hex: '#C9A24B' },
    { name: 'silver', hex: '#BFC1C2' },
];

export const colorHex = (name) => COLORS.find(c => c.name === name)?.hex ?? '#CCCCCC';
