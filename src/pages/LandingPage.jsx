import React from 'react';
import LandingNavbar from '../components/LandingNavbar';
import Hero from '../components/Hero';
import Footer from '../components/Footer';
import { Branch } from '../components/Decorations';
import { Shirt, Layers, User, Star } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';

const MotionLink = motion.create(Link);

const CategoryCard = ({ title, icon: Icon, delay, to }) => (
    <MotionLink
        to={to}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        whileHover={{ y: -4 }}
        className="bg-sage-green/80 hover:bg-sage-green aspect-square flex flex-col items-center justify-center text-off-white p-3 sm:p-6 cursor-pointer transition-colors shadow-md hover:shadow-xl border-2 border-off-white/20 group"
    >
        <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: delay * 2 }}
            className="p-4 border border-off-white/40 rounded bg-sage-green group-hover:bg-sage-dark transition-colors"
        >
            <Icon className="w-8 h-8 md:w-10 md:h-10 text-off-white" strokeWidth={1.5} />
        </motion.div>
        <span className="mt-4 font-sans tracking-wider sm:tracking-widest uppercase text-xs sm:text-sm md:text-base font-medium text-center whitespace-nowrap">{title}</span>
    </MotionLink>
);

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.2 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const LandingPage = () => {
    // Parallax logic for Perfect Look section
    const { scrollYProgress } = useScroll();
    const yParallax = useTransform(scrollYProgress, [0, 1], [0, -50]);

    return (
        <div className="bg-off-white min-h-screen flex flex-col overflow-x-clip">
            <LandingNavbar />
            <main className="flex-grow">
                <Hero />

                {/* Category Grid */}
                <section className="py-16 px-6 md:px-12 bg-off-white">
                    <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                        <CategoryCard title="New In" to="/collections?view=new" icon={Shirt} delay={0.1} />
                        <CategoryCard title="Collections" to="/collections" icon={Layers} delay={0.2} />
                        <CategoryCard title="Your Style" to="/create" icon={User} delay={0.3} />
                        <CategoryCard title="Favorites" to="/favorites" icon={Star} delay={0.4} />
                    </div>
                </section>

                {/* Perfect Look Banner */}
                <section className="w-full relative py-16 md:py-24 overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: "url('/reimagined/bg.png')", backgroundSize: '200px' }}></div>
                    <div className="absolute inset-0 bg-sage-light/80 z-0"></div>

                    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-12 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="text-center md:text-left"
                        >
                            <p className="text-sm font-sans uppercase tracking-widest text-charcoal/60 mb-2">find the</p>
                            <h2 className="text-4xl md:text-6xl text-charcoal font-sans font-medium uppercase tracking-wide">
                                Perfect Look
                            </h2>
                            <p className="font-script text-3xl md:text-5xl text-sage-green mt-[-10px] ml-4 md:ml-12 transform rotate-[-2deg]">
                                to celebrate a special moment
                            </p>
                            <div className="w-16 h-px bg-sage-green mt-8 mx-auto md:mx-0"></div>
                        </motion.div>

                        {/* Image Frames */}
                        <div className="relative w-full max-w-md h-96 flex items-center justify-center">
                            {/* Frame 1 */}
                            <motion.div
                                style={{ y: yParallax }}
                                className="absolute right-0 top-0 w-48 h-64 md:w-56 md:h-72 bg-white p-2 shadow-xl rotate-6 z-10"
                            >
                                <div className="w-full h-full overflow-hidden border border-gray-100">
                                    <img src="/reimagined/outfits1.png" className="w-full h-full object-cover" alt="Outfit 1" />
                                </div>
                            </motion.div>

                            {/* Frame 2 */}
                            <motion.div
                                initial={{ y: 50, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2, duration: 0.8 }}
                                className="absolute left-4 bottom-0 w-48 h-64 md:w-56 md:h-72 bg-white p-2 shadow-xl -rotate-3 z-20"
                            >
                                <div className="w-full h-full overflow-hidden border border-gray-100">
                                    <img src="/reimagined/outfits2.png" className="w-full h-full object-cover" alt="Outfit 2" />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Featured Styles */}
                <section className="py-20 px-6 md:px-12 bg-[#CFAB8D]">
                    <div className="max-w-7xl mx-auto">
                        <h3 className="text-center font-sans uppercase tracking-widest text-sm text-white mb-12">Featured Styles</h3>
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className="grid grid-cols-2 md:grid-cols-4 gap-6"
                        >
                            {[
                                { id: 1, src: "/featured/style1.png", title: "Date Night", vibe: "date-night" },
                                { id: 2, src: "/featured/style2.png", title: "Corporate Chic", vibe: "corporate" },
                                { id: 3, src: "/featured/style3.png", title: "Weekend Vibes", vibe: "weekend" },
                                { id: 4, src: "/featured/style4.png", title: "Toddler Edit", vibe: "toddler" }
                            ].map((item) => (
                                <motion.div key={item.id} variants={itemVariants}>
                                <Link to={`/create?vibe=${item.vibe}`} className="group cursor-pointer block">
                                    <div className="bg-gray-100 aspect-[3/4] mb-4 relative overflow-hidden rounded-md shadow-sm">
                                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors z-10 pointer-events-none"></div>
                                        {/* Zooming Image */}
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            transition={{ duration: 0.6 }}
                                            className="w-full h-full"
                                        >
                                            <img
                                                src={item.src}
                                                alt={item.title}
                                                className="w-full h-full object-cover object-center"
                                            />
                                        </motion.div>
                                    </div>
                                    <div className="text-center">
                                        <h4 className="font-script text-lg text-charcoal">{item.title}</h4>
                                        <p className="text-[0.6rem] uppercase tracking-widest text-white/0 group-hover:text-white/90 transition-colors">Style this vibe →</p>
                                    </div>
                                </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* Wave Divider (Featured Styles -> How to) */}
                <div className="bg-[#CFAB8D] relative z-10">
                    <div className="absolute -top-40 left-0 pointer-events-none z-20 mix-blend-overlay">
                        <Branch className="w-64 h-64 text-white/20" flip={true} />
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="block w-full h-auto max-h-[320px]" preserveAspectRatio="none">
                        <path fill="#DDF4E7" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,208C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>
                </div>

                {/* Instructional Section */}
                <section className="py-20 bg-[#DDF4E7] text-charcoal">
                    <div className="max-w-6xl mx-auto px-6 text-center">
                        <h2 className="font-script text-4xl sm:text-5xl mb-12">How to Use I&nbsp;&amp;&nbsp;O</h2>
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className="grid md:grid-cols-3 gap-12"
                        >
                            <MotionLink to="/wardrobe/new" variants={itemVariants} className="flex flex-col items-center group">
                                <span className="text-6xl font-script mb-4 group-hover:-translate-y-1 transition-transform">1</span>
                                <h3 className="text-xl font-bold uppercase tracking-wide mb-2">Digitize</h3>
                                <p className="text-sm opacity-80 max-w-xs">Upload your wardrobe and let our AI organize your closet inventory.</p>
                                <span className="mt-3 text-xs uppercase tracking-widest text-sage-dark opacity-0 group-hover:opacity-100 transition-opacity">Start →</span>
                            </MotionLink>
                            <MotionLink to="/create" variants={itemVariants} className="flex flex-col items-center group">
                                <span className="text-6xl font-script mb-4 group-hover:-translate-y-1 transition-transform">2</span>
                                <h3 className="text-xl font-bold uppercase tracking-wide mb-2">Set the Vibe</h3>
                                <p className="text-sm opacity-80 max-w-xs">Tell us the event or mood. "Brunch with girls" or "Corporate Chic".</p>
                                <span className="mt-3 text-xs uppercase tracking-widest text-sage-dark opacity-0 group-hover:opacity-100 transition-opacity">Start →</span>
                            </MotionLink>
                            <MotionLink to="/create" variants={itemVariants} className="flex flex-col items-center group">
                                <span className="text-6xl font-script mb-4 group-hover:-translate-y-1 transition-transform">3</span>
                                <h3 className="text-xl font-bold uppercase tracking-wide mb-2">Manifest the Fit</h3>
                                <p className="text-sm opacity-80 max-w-xs">Get AI-curated outfits instantly and shop your own closet.</p>
                                <span className="mt-3 text-xs uppercase tracking-widest text-sage-dark opacity-0 group-hover:opacity-100 transition-opacity">Start →</span>
                            </MotionLink>
                        </motion.div>
                    </div>
                </section>

                {/* Curve Divider (How to -> Footer) */}
                <div className="bg-[#DDF4E7] relative z-10">
                    <div className="absolute -top-32 right-0 pointer-events-none z-20">
                        <Branch className="w-40 h-40 text-[#556948]" />
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="block w-full h-auto max-h-[320px]" preserveAspectRatio="none">
                        <path fill="#556948" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,250.7C960,235,1056,181,1152,165.3C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>
                </div>
            </main>
            {/* <Footer /> */}
            <Footer />
        </div>
    );
};

export default LandingPage;
