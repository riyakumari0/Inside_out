import React, { useEffect, useMemo, useState } from 'react';
import { WardrobeContext } from './contexts';
import { api, toFormData } from '../api/client';

// Wardrobe state backed by the Django API. Mounted with key={email} so switching
// accounts starts fresh. Favorites update optimistically so the heart feels instant.
const WardrobeProvider = ({ owner, children }) => {
    const [items, setItems] = useState([]);
    const [looks, setLooks] = useState([]);
    const [bag, setBag] = useState([]);
    const [isLoading, setIsLoading] = useState(Boolean(owner));
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        if (!owner) return;
        let cancelled = false;
        Promise.all([api('/items/'), api('/looks/'), api('/bag/')])
            .then(([itemData, lookData, bagData]) => {
                if (cancelled) return;
                setItems(itemData);
                setLooks(lookData);
                setBag(bagData);
            })
            .catch(err => !cancelled && setLoadError(err.message))
            .finally(() => !cancelled && setIsLoading(false));
        return () => { cancelled = true; };
    }, [owner]);

    const value = useMemo(() => {
        const replaceItem = (updated) => setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
        const replaceLook = (updated) => setLooks(prev => (prev.some(l => l.id === updated.id)
            ? prev.map(l => (l.id === updated.id ? updated : l))
            : [updated, ...prev]));

        return {
            items,
            favorites: items.filter(item => item.favorite),
            looks,
            bag,
            isLoading,
            loadError,
            getItem: (id) => items.find(item => item.id === id),
            getLook: (id) => looks.find(look => look.id === id),

            // `photo` is a Blob, or undefined to leave the photo unchanged
            addItem: async (fields, photo) => {
                const item = await api('/items/', { method: 'POST', form: toFormData({ ...fields, image: photo }) });
                setItems(prev => [item, ...prev]);
                return item;
            },
            updateItem: async (id, fields, photo) => {
                const item = await api(`/items/${id}/`, { method: 'PATCH', form: toFormData({ ...fields, image: photo }) });
                replaceItem(item);
                return item;
            },
            removeItem: async (id) => {
                await api(`/items/${id}/`, { method: 'DELETE' });
                setItems(prev => prev.filter(item => item.id !== id));
                setLooks(prev => prev
                    .map(look => ({ ...look, itemIds: look.itemIds.filter(i => i !== id) }))
                    .filter(look => look.itemIds.length));
            },
            toggleFavorite: async (id) => {
                const item = items.find(i => i.id === id);
                if (!item) return;
                replaceItem({ ...item, favorite: !item.favorite });
                try {
                    replaceItem(await api(`/items/${id}/`, { method: 'PATCH', body: { favorite: !item.favorite } }));
                } catch (err) {
                    replaceItem(item);
                    throw err;
                }
            },
            markWorn: async (ids) => {
                const updated = await api('/items/mark-worn/', { method: 'POST', body: { ids: Array.isArray(ids) ? ids : [ids] } });
                updated.forEach(replaceItem);
            },

            saveLook: async ({ name, vibe, itemIds, reasoning }) => {
                const look = await api('/looks/', { method: 'POST', body: { name, vibe: vibe || '', itemIds, reasoning: reasoning || '' } });
                replaceLook(look);
                return look;
            },
            removeLook: async (id) => {
                await api(`/looks/${id}/`, { method: 'DELETE' });
                setLooks(prev => prev.filter(look => look.id !== id));
            },
            saveToBag: async (product, lookId) => {
                const saved = await api('/bag/', { method: 'POST', body: { ...product, lookId: lookId ?? null } });
                setBag(prev => (prev.some(p => p.id === saved.id) ? prev : [saved, ...prev]));
                return saved;
            },
            removeFromBag: async (id) => {
                await api(`/bag/${id}/`, { method: 'DELETE' });
                setBag(prev => prev.filter(p => p.id !== id));
            },

            // Stylist results (evaluation, generated image) come back as an updated look
            evaluateLook: async (id) => {
                const look = await api('/stylist/evaluate/', { method: 'POST', body: { lookId: id } });
                replaceLook(look);
                return look;
            },
            visualizeLook: async (id) => {
                const look = await api('/stylist/image/', { method: 'POST', body: { lookId: id } });
                replaceLook(look);
                return look;
            },
        };
    }, [items, looks, bag, isLoading, loadError]);

    return <WardrobeContext.Provider value={value}>{children}</WardrobeContext.Provider>;
};

export default WardrobeProvider;
