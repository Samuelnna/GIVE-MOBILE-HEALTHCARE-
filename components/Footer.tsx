import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white pt-12 pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 pb-10 border-b border-white/10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src="/mobiledoclogo.jpeg" alt="MobileDoc Logo" className="h-14 w-14 rounded-2xl object-contain bg-white" />
              <span className="font-black text-2xl tracking-tight text-white">MobileDoc</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md font-medium">
              MobileDoc is the digital healthcare product of Mobile Healthcare International LTD — secure consults, triage, and medication access across Nigeria.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">Company</p>
            <ul className="space-y-2 text-sm font-semibold">
              <li><a href="/about" className="text-slate-300 hover:text-white">About</a></li>
              <li><a href="/about#contact" className="text-slate-300 hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">Support</p>
            <a href="tel:+2348161502448" className="text-slate-300 text-sm font-semibold hover:text-white">+234 816 150 2448</a>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mt-5 mb-3">HQ</p>
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
              No 5 Amechi Awkunanaw<br />Enugu State, Nigeria
            </p>
          </div>
        </div>
        <div className="pt-6 text-center text-slate-500 text-xs sm:text-sm">
          <p>© {currentYear} MobileDoc. Powered by Mobile Healthcare International LTD. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
