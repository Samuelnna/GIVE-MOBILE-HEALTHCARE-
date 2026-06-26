
import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 transform hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col items-center text-center border border-slate-100 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 group-hover:bg-emerald-100 transition-colors duration-500"></div>
      
      <div className="bg-slate-50 p-5 rounded-2xl mb-6 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 relative z-10 shadow-sm">
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'h-10 w-10' }) : icon}
      </div>
      <h3 className="text-xl font-black mb-3 text-slate-800 group-hover:text-emerald-700 transition-colors relative z-10 leading-tight">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed relative z-10 text-sm">{description}</p>
      
      <div className="mt-6 flex items-center text-emerald-600 font-bold text-sm group-hover:gap-2 transition-all relative z-10">
        <span>Learn more</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:ml-2 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
};

export default FeatureCard;