
import React, { useState, useEffect } from 'react';

const slides = [
  {
    image: '/slid1.jpg',
    title: 'Your Health, Perfectly Managed.',
    subtitle: 'Experience healthcare everywhere you go. Professional consultations at your fingertips.'
  },
  {
    image: '/slid2.jpg',
    title: 'Expert Doctors, Anytime.',
    subtitle: 'Connect with specialized healthcare professionals from the comfort of your home.'
  },
  {
    image: '/slid3.jpg',
    title: 'Wellness & Prevention.',
    subtitle: 'Stay ahead of your health with AI-powered triage and proactive wellness tools.'
  }
];

const HeroSlideshow: React.FC<{ onAppointmentsClick: () => void }> = ({ onAppointmentsClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleServicesScroll = () => {
    const target = document.getElementById('services-section');
    if (target) {
        const offset = 80; // Account for fixed header
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = target.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[300px] sm:h-[500px] md:h-[600px] overflow-hidden bg-slate-900">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Image Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent z-10" />
          <img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover transition-transform duration-[10s] ease-linear transform scale-110 active-slide-zoom"
            style={{ transform: index === currentSlide ? 'scale(1.0)' : 'scale(1.1)' }}
          />
          
          <div className="absolute inset-0 z-20 flex items-center pt-10 sm:pt-0">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-left">
              <div className={`max-w-2xl transition-all duration-700 delay-300 transform ${
                index === currentSlide ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}>
                <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-white mb-4 sm:mb-6 tracking-tight leading-tight">
                  {slide.title.split(',').map((part, i) => (
                    <span key={i}>
                        {part}{i === 0 && ','} <br className="hidden md:block" />
                    </span>
                  ))}
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-slate-200 mb-6 sm:mb-8 font-medium leading-relaxed max-w-lg">
                  {slide.subtitle}
                </p>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <button
                    onClick={onAppointmentsClick}
                    className="px-6 py-3 sm:px-8 sm:py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/25 active:scale-95 text-sm sm:text-base"
                  >
                    My Appointments
                  </button>
                  <button
                    onClick={handleServicesScroll}
                    className="hidden sm:flex px-6 py-3 sm:px-8 sm:py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 font-bold rounded-2xl hover:bg-white/20 transition-all active:scale-95 text-sm sm:text-base"
                  >
                    Explore Services
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Slide Indicators - Hidden on small mobile */}
      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 hidden xs:flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 transition-all duration-300 rounded-full ${
              index === currentSlide ? 'w-10 bg-emerald-500' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlideshow;
