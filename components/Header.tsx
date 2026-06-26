
import React, { useState, useEffect, useRef } from 'react';
import type { Section } from '../types';
import { HospitalIcon, BellIcon, ShoppingCartIcon, Cog6ToothIcon, PatientIcon, DoctorProfileIcon, UserPlusIcon } from './IconComponents';
import { requestNotificationPermission } from '../utils/notifications';
import { CartItem, User } from '../types';
import { useNotification } from '../contexts/NotificationContext';

interface HeaderProps {
  user: User;
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  cartItems: CartItem[];
  onCartClick: () => void;
  onOpenCreatePatient?: () => void;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, activeSection, setActiveSection, cartItems, onCartClick, onOpenCreatePatient, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotification();

  const isAdmin = user.userType === 'admin';
  const isProfessional = user.userType === 'professional';

  useEffect(() => {
    if ('permission' in Notification) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async () => {
    const status = await requestNotificationPermission();
    setPermissionStatus(status);
    if (status === 'granted') {
      addNotification('Notifications Enabled', 'Important updates will be sent to you.', 'success');
    }
  };

  const navItems: { name: Section, label: string }[] = isAdmin
    ? [{ name: 'Dashboard', label: 'Admin Home' }]
    : isProfessional
    ? [
        { name: 'Dashboard', label: 'Home' },
        { name: 'Appointments', label: 'Appointments' },
        { name: 'Messaging', label: 'Messages' },
      ]
    : [
        { name: 'Dashboard', label: 'Home' },
        { name: 'Health Summary', label: 'Health Summary' },
        { name: 'Appointments', label: 'Appointments' },
        { name: 'Messaging', label: 'Messages' },
        { name: 'Hospitals', label: 'Hospitals' },
        { name: 'Doctors', label: 'Doctors' },
        { name: 'Labs', label: 'Labs' },
        { name: 'Pharmacy', label: 'Pharmacy' },
        { name: 'Patient Records', label: 'My Records' },
      ];

  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const NavLink: React.FC<{ name: Section, label: string, isMobile?: boolean }> = ({ name, label, isMobile }) => {
    const isActive = activeSection === name;
    return (
      <button
        onClick={() => {
          setActiveSection(name);
          setIsMenuOpen(false);
        }}
        className={`${isMobile ? 'w-full text-left px-6 py-4 border-b border-white/10 last:border-0' : 'px-4 py-2 rounded-xl whitespace-nowrap'} text-sm font-bold transition-all duration-200 ${
          isActive
            ? (isAdmin || isProfessional ? 'bg-white text-teal-900 shadow-lg' : 'bg-slate-900 text-white shadow-sm')
            : (isAdmin || isProfessional ? 'text-white/70 hover:text-white' : 'text-slate-600 hover:text-slate-900')
        }`}
      >
        {label}
      </button>
    );
  };
  
  const UserIcon = user.userType === 'patient' ? PatientIcon : DoctorProfileIcon;

  return (
    <>
    <header className={`${isAdmin ? 'bg-slate-900' : (isProfessional ? 'bg-teal-900' : 'bg-white/90 backdrop-blur-md')} border-b ${isAdmin || isProfessional ? 'border-white/10' : 'border-slate-100'} fixed w-full top-0 z-50`}>
      {isAdmin && (
        <div className="bg-amber-400 text-slate-900 text-[9px] font-black text-center uppercase tracking-widest py-1">Admin Mode</div>
      )}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between ${isAdmin || isProfessional ? 'h-14' : 'h-16'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveSection('Dashboard')} className="flex items-center gap-2 group">
              <img src="/logo.jpeg" alt="Logo" className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover shadow-sm" />
              <span className={`font-black text-lg sm:text-xl tracking-tighter ${isAdmin || isProfessional ? 'text-white' : 'text-slate-900'}`}>GIVE</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {navItems.map(item => <NavLink key={item.name} {...item} />)}
          </div>

          <div className={`flex items-center gap-1 sm:gap-2 ${isAdmin || isProfessional ? 'text-white' : ''}`}>
             {isProfessional && onOpenCreatePatient && (
                <button onClick={onOpenCreatePatient} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all hidden md:flex"><UserPlusIcon className="h-5 w-5" /></button>
             )}
             
             <button onClick={handleNotificationClick} className={`p-2 rounded-xl transition-all relative ${isAdmin || isProfessional ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-slate-100 text-slate-400'}`}>
                <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                {permissionStatus === 'default' && <span className="absolute top-2 right-2 h-2 w-2 bg-amber-500 rounded-full border-2 border-white animate-pulse"></span>}
            </button>

            {user.userType === 'patient' && (
              <button onClick={onCartClick} className="relative p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400 group">
                <ShoppingCartIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                {totalCartItems > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-black text-white ring-2 ring-white">{totalCartItems}</span>}
              </button>
            )}

             <div className="relative ml-1 sm:ml-2" ref={profileMenuRef}>
                <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="focus:outline-none p-1">
                  {user.imageUrl ? (
                    <img src={user.imageUrl} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border-2 border-emerald-500 shadow-sm" />
                  ) : (
                    <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center ${isAdmin || isProfessional ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-600'}`}><UserIcon className="h-5 w-5 sm:h-6 sm:w-6" /></div>
                  )}
                </button>
                
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl py-2 bg-white ring-1 ring-black/5 animate-slide-up">
                    <div className="px-4 py-3 border-b border-slate-50">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signed in as</p>
                        <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                    </div>
                    <button onClick={() => { setActiveSection('Profile'); setIsProfileMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                        <Cog6ToothIcon className="h-4 w-4 text-slate-400"/> Profile Settings
                    </button>
                    {onLogout && (
                        <button onClick={() => { onLogout(); setIsProfileMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-slate-50 transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Logout
                        </button>
                    )}
                  </div>
                )}
            </div>

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 text-slate-800 hover:opacity-70 transition-opacity">
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  {isMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    {isMenuOpen && (
        <div className={`lg:hidden fixed inset-0 z-40 ${isAdmin || isProfessional ? 'bg-slate-900' : 'bg-emerald-600'} transition-all`}>
          <div className="flex flex-col h-full pt-20">
            <div className="px-6 mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Navigator</p>
            </div>
            <div className="flex-1 overflow-y-auto px-2">
                {navItems.map(item => <NavLink key={item.name} {...item} isMobile />)}
            </div>
            <div className="p-6 bg-black/20 mt-auto">
                <div className="flex items-center gap-4 mb-8">
                    {user.imageUrl ? <img src={user.imageUrl} className="h-12 w-12 rounded-full border-2 border-white/20 object-cover" /> : <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center"><UserIcon className="h-6 w-6 text-white" /></div>}
                    <div>
                        <p className="text-white font-bold">{user.name}</p>
                        <p className="text-white/40 text-[10px] uppercase font-black tracking-widest">{user.userType}</p>
                    </div>
                </div>
                {onLogout && (
                    <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full py-4 bg-white text-red-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Secure Sign Out</button>
                )}
            </div>
          </div>
        </div>
    )}
    </>
  );
};

export default Header;
