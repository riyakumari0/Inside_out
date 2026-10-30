import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import ContactPage from './pages/ContactPage';
import Dashboard from './pages/Dashboard';
import CollectionsPage from './pages/CollectionsPage';
import FavoritesPage from './pages/FavoritesPage';
import CreatePage from './pages/CreatePage';
import AddItemPage from './pages/AddItemPage';
import ItemPage from './pages/ItemPage';
import NotFoundPage from './pages/NotFoundPage';
import BagPage from './pages/BagPage';
import ProfilePage from './pages/ProfilePage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordResetPages';
import ProtectedLayout from './components/ProtectedLayout';
import ScrollToTop from './components/ScrollToTop';
import AuthProvider from './context/AuthProvider';
import WardrobeProvider from './context/WardrobeProvider';
import ToastProvider from './context/ToastProvider';
import useAuth from './hooks/useAuth';

// Remount the wardrobe when the account changes so each user sees their own closet
const UserWardrobe = ({ children }) => {
    const { user } = useAuth();
    return <WardrobeProvider key={user?.email ?? 'guest'} owner={user?.email}>{children}</WardrobeProvider>;
};

function App() {
    return (
        <AuthProvider>
            <UserWardrobe>
                <ToastProvider>
                    <Router>
                        <ScrollToTop />
                        <Routes>
                            {/* Public */}
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/about" element={<AboutPage />} />
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/signup" element={<LoginPage mode="signup" />} />
                            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                            <Route path="/reset-password" element={<ResetPasswordPage />} />
                            <Route path="/contact" element={<ContactPage />} />

                            {/* Logged in */}
                            <Route element={<ProtectedLayout />}>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/collections" element={<CollectionsPage />} />
                                <Route path="/favorites" element={<FavoritesPage />} />
                                <Route path="/create" element={<CreatePage />} />
                                <Route path="/bag" element={<BagPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/wardrobe/new" element={<AddItemPage />} />
                                <Route path="/wardrobe/:id" element={<ItemPage />} />
                                <Route path="/wardrobe/:id/edit" element={<AddItemPage key="edit" />} />
                            </Route>

                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </Router>
                </ToastProvider>
            </UserWardrobe>
        </AuthProvider>
    );
}

export default App;
