import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="GIVE Logo" className="h-10 w-10 rounded-xl object-cover" />
            <span className="font-black text-2xl tracking-tight text-white">GIVE</span>
          </div>

          {/* Copyright */}
          <div className="text-center text-slate-500 text-sm">
            <p>© {currentYear} GIVE Healthcare. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;