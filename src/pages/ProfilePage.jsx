import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Trash2 } from 'lucide-react';
import PageShell from '../components/PageShell';
import useAuth from '../hooks/useAuth';
import useToast from '../hooks/useToast';
import useWardrobe from '../hooks/useWardrobe';
import { processClothingPhoto } from '../utils/image';
import { ghostButton, primaryButton } from '../utils/styles';

const fieldClass = 'w-full bg-transparent border-b border-white/50 focus:border-white outline-none py-2 text-sm placeholder-white/50';

const Field = ({ label, ...props }) => (
    <label className="block">
        <span className="block text-xs uppercase tracking-widest text-white/80 mb-2">{label}</span>
        <input className={fieldClass} {...props} />
    </label>
);

const Section = ({ title, children }) => (
    <section className="border-t border-white/30 pt-8 mb-12">
        <h2 className="text-xl font-sans mb-6 uppercase tracking-widest">{title}</h2>
        {children}
    </section>
);

const ErrorText = ({ children }) => children ? <p className="text-sm bg-white/90 text-red-600 px-4 py-2" role="alert">{children}</p> : null;

const ProfilePage = () => {
    const { user, updateProfile, changePassword, uploadAvatar, removeAvatar, deleteAccount } = useAuth();
    const { items, looks, bag } = useWardrobe();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [emailPassword, setEmailPassword] = useState('');
    const [profileError, setProfileError] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');

    const emailChanged = email.trim().toLowerCase() !== user.email;

    const saveProfile = async (e) => {
        e.preventDefault();
        if (!name.trim()) return setProfileError('Please enter your name.');
        setProfileError('');
        try {
            await updateProfile({ name, email, ...(emailChanged ? { currentPassword: emailPassword } : {}) });
            setEmailPassword('');
            showToast('Profile saved');
        } catch (err) {
            setProfileError(err.message);
        }
    };

    const savePassword = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) return setPasswordError('New password must be at least 8 characters.');
        setPasswordError('');
        try {
            await changePassword(currentPassword, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            showToast('Password changed');
        } catch (err) {
            setPasswordError(err.message);
        }
    };

    const pickAvatar = async (file) => {
        if (!file) return;
        try {
            const { blob } = await processClothingPhoto(file, 600);
            await uploadAvatar(blob);
            showToast('Photo updated');
        } catch (err) {
            showToast(err.message);
        }
    };

    const removeAccount = async (e) => {
        e.preventDefault();
        if (!window.confirm('Delete your account, closet, looks and photos forever? This cannot be undone.')) return;
        setDeleteError('');
        try {
            await deleteAccount(deletePassword);
            navigate('/', { replace: true });
        } catch (err) {
            setDeleteError(err.message);
        }
    };

    return (
        <PageShell eyebrow={`${items.length} ${items.length === 1 ? 'piece' : 'pieces'} · ${looks.length} ${looks.length === 1 ? 'look' : 'looks'} · ${bag.length} in your bag`} title="Your Profile" width="max-w-3xl">
            <section className="flex flex-wrap items-center gap-6 mb-12">
                <button type="button" onClick={() => fileRef.current?.click()} aria-label="Change profile photo" className="group w-24 h-24 rounded-full overflow-hidden bg-sage-green relative shrink-0 border-2 border-white/60">
                    {user.avatar
                        ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        : <span className="w-full h-full flex items-center justify-center text-3xl uppercase">{user.name.trim().charAt(0)}</span>}
                    <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera size={20} /></span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickAvatar(e.target.files[0])} />
                <div className="min-w-0">
                    <p className="font-script text-3xl truncate">{user.name}</p>
                    {user.avatar && (
                        <button type="button" onClick={() => removeAvatar().catch(err => showToast(err.message))} className="text-xs uppercase tracking-widest text-white/80 hover:text-white">Remove photo</button>
                    )}
                </div>
            </section>

            <Section title="Details">
                <form onSubmit={saveProfile} noValidate className="flex flex-col gap-6">
                    <Field label="Name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    {emailChanged && <Field label="Current password (to change your email)" type="password" autoComplete="current-password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />}
                    <ErrorText>{profileError}</ErrorText>
                    <div className="flex justify-end"><button type="submit" className={primaryButton}>Save Changes</button></div>
                </form>
            </Section>

            <Section title="Password">
                <form onSubmit={savePassword} noValidate className="flex flex-col gap-6">
                    <Field label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    <Field label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <ErrorText>{passwordError}</ErrorText>
                    <div className="flex justify-end"><button type="submit" className={primaryButton}>Change Password</button></div>
                </form>
            </Section>

            <Section title="Delete account">
                <form onSubmit={removeAccount} noValidate className="flex flex-col gap-6">
                    <p className="text-sm text-white/90">This permanently deletes your account, closet, looks, bag and photos.</p>
                    <Field label="Your password" type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                    <ErrorText>{deleteError}</ErrorText>
                    <div className="flex justify-end">
                        <button type="submit" className={`${ghostButton} hover:!bg-red-500 hover:!border-red-500 hover:!text-white`}><Trash2 size={14} /> Delete Account</button>
                    </div>
                </form>
            </Section>
        </PageShell>
    );
};

export default ProfilePage;
