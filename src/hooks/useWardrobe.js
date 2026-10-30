import { useContext } from 'react';
import { WardrobeContext } from '../context/contexts';

const useWardrobe = () => {
    const context = useContext(WardrobeContext);
    if (!context) {
        throw new Error('useWardrobe must be used inside <WardrobeProvider>');
    }
    return context;
};

export default useWardrobe;
