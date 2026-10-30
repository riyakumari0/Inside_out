import { COLORS } from '../data/wardrobe';

const loadImage = (file) =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read that image.'));
        };
        img.src = url;
    });

const hexToRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

const nearestColorName = ([r, g, b]) => {
    let best = COLORS[0];
    let bestDistance = Infinity;
    for (const color of COLORS) {
        const [cr, cg, cb] = hexToRgb(color.hex);
        const distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
        if (distance < bestDistance) {
            best = color;
            bestDistance = distance;
        }
    }
    return best.name;
};

// Most common colour in the photo, ignoring near-white pixels (usually the background)
const dominantColor = (img) => {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
        if (a < 128 || (r > 235 && g > 235 && b > 235)) continue;
        const key = `${r >> 5},${g >> 5},${b >> 5}`;
        const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        buckets.set(key, bucket);
    }

    const top = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
    if (!top) return 'white';
    return nearestColorName([top.r / top.count, top.g / top.count, top.b / top.count]);
};

// Shrinks a photo before upload (the server re-checks and re-encodes it) and guesses its main colour
export const processClothingPhoto = async (file, maxSize = 1200) => {
    const img = await loadImage(file);
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    // JPEG has no transparency, so give cut-out PNGs a white backdrop instead of black
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Could not process that image.');

    return {
        blob,
        previewUrl: URL.createObjectURL(blob),
        color: dominantColor(img),
    };
};
