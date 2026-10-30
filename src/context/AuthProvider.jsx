import React, { useEffect, useMemo, useState } from 'react';
import { AuthContext } from './contexts';
import { api, ensureCsrf, toFormData } from '../api/client';

// Session auth against the Django API: passwords are hashed and checked on the server,
// and the session lives in an HttpOnly cookie the browser's JavaScript can't read.
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        ensureCsrf()
            .then(() => api('/auth/me/'))
            .then(data => !cancelled && setUser(data.user))
            .catch(() => !cancelled && setUser(null))
            .finally(() => !cancelled && setIsLoading(false));
        return () => { cancelled = true; };
    }, []);

    const value = useMemo(() => ({
        user,
        isLoading,
        signUp: async ({ name, email, password }) => {
            const data = await api('/auth/signup/', { method: 'POST', body: { name, email, password } });
            setUser(data.user);
        },
        logIn: async ({ email, password }) => {
            const data = await api('/auth/login/', { method: 'POST', body: { email, password } });
            setUser(data.user);
        },
        logOut: async () => {
            await api('/auth/logout/', { method: 'POST' }).catch(() => {});
            setUser(null);
        },
        updateProfile: async (fields) => {
            const data = await api('/auth/profile/', { method: 'PATCH', body: fields });
            setUser(data.user);
        },
        changePassword: (currentPassword, newPassword) =>
            api('/auth/change-password/', { method: 'POST', body: { currentPassword, newPassword } }),
        uploadAvatar: async (blob) => {
            const data = await api('/auth/avatar/', { method: 'POST', form: toFormData({ image: blob }) });
            setUser(data.user);
        },
        removeAvatar: async () => {
            const data = await api('/auth/avatar/', { method: 'DELETE' });
            setUser(data.user);
        },
        deleteAccount: async (password) => {
            await api('/auth/delete-account/', { method: 'POST', body: { password } });
            setUser(null);
        },
    }), [user, isLoading]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
