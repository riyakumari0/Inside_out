import React from 'react';
import { Menu, Plus, Grid, Home as HomeIcon, Shirt } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    return (
        <div className="min-h-screen bg-off-white flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col p-6">
                <h2 className="font-script text-3xl mb-12 text-center text-sage-green">I & O</h2>

                <nav className="flex flex-col gap-6 text-sm uppercase tracking-widest text-gray-400 font-medium">
                    <Link to="/" className="flex items-center gap-3 hover:text-charcoal transition-colors">
                        <HomeIcon className="w-5 h-5" /> Home
                    </Link>
                    <div className="flex items-center gap-3 text-charcoal">
                        <Grid className="w-5 h-5" /> The Vault
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-12">
                <header className="flex justify-between items-center mb-12">
                    <div className="md:hidden">
                        <Menu className="w-6 h-6 text-charcoal" />
                    </div>
                    <h1 className="text-2xl font-sans uppercase tracking-widest text-charcoal">My Wardrobe</h1>
                    <div className="w-10 h-10 bg-sage-green rounded-full flex items-center justify-center text-off-white font-script text-xl shadow-md">
                        U
                    </div>
                </header>

                {/* Filter Row */}
                <div className="flex gap-4 mb-8 overflow-x-auto pb-4 md:pb-0">
                    {['All', 'Tops', 'Bottoms', 'Shoes', 'Accessories'].map((filter, i) => (
                        <button key={filter} className={`px-6 py-2 rounded-full text-xs uppercase tracking-wider border transition-colors ${i === 0 ? 'bg-charcoal text-white border-charcoal' : 'bg-transparent border-gray-200 hover:border-sage-green'}`}>
                            {filter}
                        </button>
                    ))}
                </div>

                {/* Empty State / Grid Placeholder */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="aspect-[3/4] border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-300 hover:border-sage-green hover:text-sage-green transition-colors cursor-pointer group">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-sage-green/10 transition-colors mb-2">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-xs uppercase tracking-widest">Add Item</span>
                    </div>

                    {/* Mock Items */}
                    {[1, 2, 3].map(item => (
                        <div key={item} className="bg-white p-4 rounded-lg shadow-sm border border-gray-50">
                            <div className="aspect-square bg-gray-100 rounded mb-4"></div>
                            <h3 className="font-script text-lg text-charcoal">Item Name</h3>
                            <p className="text-xs text-gray-400 uppercase tracking-widest">Category</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
