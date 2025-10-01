import React, { useEffect, useRef } from 'react';
import './HomePage.css';

// Helper for smooth scrolling
const scrollToSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

const HomePage = ({ onNavigate, user, navigateToQuiz }) => { // Added navigateToQuiz prop
    const canvasRef = useRef(null);

    // Effect for animated background
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particlesArray;

        const setCanvasSize = () => {
            canvas.width = window.innerWidth;
            canvas.height = canvas.parentElement.offsetHeight;
        };
        setCanvasSize();

        class Particle {
            constructor(x, y, dX, dY, size) { this.x = x; this.y = y; this.directionX = dX; this.directionY = dY; this.size = size; }
            draw() { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = 'rgba(150, 220, 255, 0.5)'; ctx.fill(); }
            update() {
                if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
                if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
                this.x += this.directionX; this.y += this.directionY;
                this.draw();
            }
        }

        const init = () => {
            particlesArray = [];
            let num = (canvas.height * canvas.width) / 9000;
            for (let i = 0; i < num; i++) {
                let size = (Math.random() * 2) + 1;
                let x = (Math.random() * canvas.width);
                let y = (Math.random() * canvas.height);
                let dX = (Math.random() * .4) - 0.2;
                let dY = (Math.random() * .4) - 0.2;
                particlesArray.push(new Particle(x, y, dX, dY, size));
            }
        };

        const animate = () => {
            requestAnimationFrame(animate);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particlesArray.forEach(p => p.update());
            connect();
        };

        const connect = () => {
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    let dist = ((particlesArray[a].x - particlesArray[b].x) ** 2) + ((particlesArray[a].y - particlesArray[b].y) ** 2);
                    if (dist < (canvas.width / 7) * (canvas.height / 7)) {
                        ctx.strokeStyle = `rgba(100, 180, 255, ${1 - (dist / 20000)})`;
                        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(particlesArray[a].x, particlesArray[a].y); ctx.lineTo(particlesArray[b].x, particlesArray[b].y); ctx.stroke();
                    }
                }
            }
        };

        const handleResize = () => { setCanvasSize(); init(); };
        window.addEventListener('resize', handleResize);
        init(); animate();

        // Cleanup function to remove event listener
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleNavClick = (e, sectionId) => { e.preventDefault(); scrollToSection(sectionId); };

    return (
        <div className="homepage-container">
            <nav className="navbar">
                <div className="logo" onClick={() => scrollToSection('hero')}>🧠 CogniPath AI</div>
                <div className="nav-links">
                    <ul>
                        <li><a href="#features" onClick={(e) => handleNavClick(e, 'features')}>Features</a></li>
                        <li><a href="#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')}>How It Works</a></li>
                        <li><a href="#team" onClick={(e) => handleNavClick(e, 'team')}>Our Team</a></li>
                        <li><a href="#contact" onClick={(e) => handleNavClick(e, 'contact')}>Contact</a></li>
                    </ul>
                    <div className="nav-user-actions">
                        {user ? (<><span>Welcome, {user.name}!</span><button onClick={() => onNavigate('profile')} className="nav-btn">My Dashboard</button></>) 
                              : (<button onClick={() => onNavigate('auth')} className="nav-btn">Login / Register</button>)}
                    </div>
                </div>
            </nav>

            <header id="hero" className="hero-section"><canvas id="hero-canvas" ref={canvasRef}></canvas>
                <div className="hero-content">
                    <h1 className="hero-title">Unlock Your True Learning Potential</h1>
                    <p className="hero-subtitle">CogniPath AI analyzes your unique learning style to create a personalized educational journey just for you.</p>
                    <div className="hero-buttons">
                        <button onClick={() => onNavigate(user ? 'profile' : 'auth')} className="cta-button">{user ? 'Go to My Dashboard' : 'Get Started for Free'}</button>
                        {/* FIX: This button now goes directly to the quiz if logged in */}
                        <button onClick={() => user ? navigateToQuiz() : onNavigate('auth')} className="cta-button secondary">Practice Exam</button>
                    </div>
                </div>
            </header>

            <main>
                <section id="features" className="content-section services-section">
                    <h2>A Smarter Way to Learn</h2><p className="section-subtitle">Our platform is more than just a quiz app. It's a comprehensive learning ecosystem.</p>
                    <div className="services-grid">
                        <div className="service-card"><div className="service-icon">🎯</div><h3>Adaptive Assessments</h3><p>Our AI intelligently adjusts question difficulty based on your performance, ensuring you're always challenged but never overwhelmed.</p></div>
                        <div className="service-card"><div className="service-icon">🧬</div><h3>Generative Content</h3><p>Using a fine-tuned LLM, we generate unique questions that directly target your identified learning gaps, making every session effective.</p></div>
                        <div className="service-card"><div className="service-icon">📊</div><h3>Diagnostic Reporting</h3><p>Receive clear, actionable insights into your cognitive strengths across comprehension, application, and retention.</p></div>
                        <div className="service-card"><div className="service-icon">📈</div><h3>Mastery Tracking</h3><p>Our Bayesian Knowledge Tracing model determines if you've truly mastered a skill, preventing "lucky guesses" from moving you on too soon.</p></div>
                    </div>
                </section>
                <section id="how-it-works" className="content-section">
                    <h2>Three Steps to Success</h2><p className="section-subtitle">Getting started on your personalized learning path is simple.</p>
                    <div className="services-grid">
                        <div className="service-card"><h3>1. Assess</h3><p>Take our initial adaptive assessment to create your unique Cognitive Fingerprint. We identify your baseline knowledge and learning style.</p></div>
                        <div className="service-card"><h3>2. Personalize</h3><p>Our AI agents collaborate to generate a custom learning plan with unique questions and content tailored specifically to your needs.</p></div>
                        <div className="service-card"><h3>3. Master</h3><p>Engage with the content, receive instant feedback, and watch your skills grow. Our system adapts with you, ensuring continuous improvement.</p></div>
                    </div>
                </section>
                <section id="team" className="content-section team-section">
                    <h2>Meet Our Team</h2><p className="section-subtitle">The innovators and educators dedicated to revolutionizing your learning experience.</p>
                    <div className="team-grid">
                        <div className="team-member"><img src="https://placehold.co/200x200/61dafb/282c34?text=AI" alt="Team Member 1" /><h3>Ajay Kumar</h3><p>Team Lead</p></div>
                        <div className="team-member"><img src="https://placehold.co/200x200/28a745/282c34?text=Edu" alt="Team Member 2" /><h3>Adithya N Murthy</h3><p>AI/ML Engineer</p></div>
                        <div className="team-member"><img src="https://placehold.co/200x200/ffc107/282c34?text=UX" alt="Team Member 3" /><h3>Abhishek Biradar</h3><p>Lead UX Designer</p></div>
                        <div className="team-member"><img src="https://placehold.co/200x200/dc3545/282c34?text=Eng" alt="Team Member 4" /><h3>Sidaray M S</h3><p>Testing Engineer</p></div>
                    </div>
                </section>
                <section id="contact" className="content-section contact-section">
                    <h2>Get In Touch</h2><p className="section-subtitle">Have questions or want to learn more about institutional partnerships? Reach out to us!</p>
                    <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
                        <input type="text" placeholder="Your Name" required /><input type="email" placeholder="Your Email" required />
                        <textarea placeholder="Your Message" required></textarea><button type="submit">Send Message</button>
                    </form>
                </section>
            </main>

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-logo">🧠 CogniPath AI</div>
                    <div className="footer-links">
                        <a href="#features" onClick={(e) => handleNavClick(e, 'features')}>Features</a>
                        <a href="#how-it-works" onClick={(e) => handleNavClick(e, 'how-it-works')}>How It Works</a>
                        <a href="#team" onClick={(e) => handleNavClick(e, 'team')}>Team</a>
                        <a href="#contact" onClick={(e) => handleNavClick(e, 'contact')}>Contact</a>
                    </div>
                </div>
                <div className="footer-copyright"><p>&copy; 2025 CogniPath AI. All Rights Reserved.</p></div>
            </footer>
        </div>
    );
};

export default HomePage;

