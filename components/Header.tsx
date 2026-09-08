
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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const { notifications, addNotification, removeNotification } = useNotification();

  const isAdmin = user.userType === 'admin';
  const isProfessional = user.userType === 'professional';

  useEffect(() => {
    if (typeof Notification !== 'undefined' && 'permission' in Notification) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
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

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const NavLink: React.FC<{ name: Section, label: string, isMobile?: boolean }> = ({ name, label, isMobile }) => {
    const isActive = activeSection === name;
    if (isMobile) {
      return (
        <button
          onClick={() => {
            setActiveSection(name);
            setIsMenuOpen(false);
          }}
          className={`w-full text-left px-5 py-3.5 rounded-2xl text-base font-black tracking-wide transition-all ${
            isActive
              ? 'bg-white text-emerald-900 shadow-lg'
              : 'text-white hover:bg-white/15'
          }`}
        >
          {label}
        </button>
      );
    }
    return (
      <button
        onClick={() => setActiveSection(name)}
        className={`px-3 py-1.5 rounded-full whitespace-nowrap text-[11px] xl:text-xs font-black uppercase tracking-wider transition-all duration-300 ${
          isActive
            ? (isAdmin || isProfessional ? 'bg-white text-teal-900 shadow-md scale-105' : 'bg-slate-900 text-white shadow-sm scale-105')
            : (isAdmin || isProfessional ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50')
        }`}
      >
        {label}
      </button>
    );
  };
  
  const UserIcon = PatientIcon;

  return (
    <>
    <header className={`${
      isMenuOpen
        ? (isAdmin ? 'bg-slate-950' : isProfessional ? 'bg-teal-950' : 'bg-emerald-950')
        : isAdmin ? 'bg-slate-900' : (isProfessional ? 'bg-teal-900' : 'bg-white/90 backdrop-blur-md')
    } border-b ${isAdmin || isProfessional || isMenuOpen ? 'border-white/10' : 'border-slate-100'} fixed w-full top-0 z-50`}>
      {isAdmin && (
        <div className="bg-amber-400 text-slate-900 text-[9px] font-black text-center uppercase tracking-widest py-1">Admin Mode</div>
      )}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between ${isAdmin || isProfessional ? 'h-14' : 'h-16'}`}>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setActiveSection('Dashboard')} className="flex items-center gap-2 group mr-2 xl:mr-6">
              <img src="/mobiledoclogo.jpeg" alt="MobileDoc Logo" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-contain bg-white" />
              <span className={`font-black text-base sm:text-lg tracking-tighter ${isAdmin || isProfessional || isMenuOpen ? 'text-white' : 'text-slate-900'}`}>MobileDoc</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center px-2">
            {navItems.map(item => <NavLink key={item.name} {...item} />)}
          </div>

          <div className={`flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ${isAdmin || isProfessional || isMenuOpen ? 'text-white' : ''}`}>
             {isProfessional && onOpenCreatePatient && (
                <button onClick={onOpenCreatePatient} className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all hidden md:flex"><UserPlusIcon className="h-5 w-5" /></button>
             )}
             
             <div className="relative" ref={notificationMenuRef}>
                <button 
                    onClick={() => {
                        if (notifications.length > 0) setIsNotificationOpen(!isNotificationOpen);
                        else handleNotificationClick();
                    }} 
                    className={`p-2 rounded-xl transition-all relative ${isAdmin || isProfessional || isMenuOpen ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-500'}`}
                >
                    <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    {notifications.length > 0 && <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white animate-bounce"></span>}
                    {permissionStatus === 'default' && notifications.length === 0 && <span className="absolute top-2 right-2 h-2 w-2 bg-amber-500 rounded-full border-2 border-white animate-pulse"></span>}
                </button>

                {isNotificationOpen && notifications.length > 0 && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl py-2 bg-white ring-1 ring-black/5 animate-slide-up z-[60]">
                        <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Notifications</p>
                            <span className="text-[10px] bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full font-bold">{notifications.length} New</span>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.map(n => (
                                <div key={n.id} className="px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors relative group">
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{n.title}</p>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                                    <button onClick={() => removeNotification(n.id)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">✕</button>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t border-slate-50 text-center">
                            <button onClick={() => setIsNotificationOpen(false)} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Close</button>
                        </div>
                    </div>
                )}
            </div>

            {user.userType === 'patient' && (
              <button onClick={onCartClick} className={`relative p-2 rounded-xl transition-all group ${isMenuOpen ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-500'}`}>
                <ShoppingCartIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                {totalCartItems > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-black text-white ring-2 ring-white">{totalCartItems}</span>}
              </button>
            )}

              <div className="relative ml-1 sm:ml-2" ref={profileMenuRef}>
                <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="focus:outline-none p-1 group">
                  {user.imageUrl ? (
                    <img src={user.imageUrl} className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover border-2 border-emerald-500 shadow-sm" />
                  ) : (
                    <div className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center transition-all ${isAdmin || isProfessional ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}><UserIcon className="h-5 w-5 sm:h-6 sm:w-6" /></div>
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

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`lg:hidden p-2 rounded-xl ${
                isAdmin || isProfessional || isMenuOpen ? 'text-white bg-white/10' : 'text-slate-900 hover:bg-slate-100'
              }`}
              aria-label="Open menu"
            >
                <svg className="h-7 w-7" stroke="currentColor" fill="none" strokeWidth={2} viewBox="0 0 24 24">
                  {isMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    {isMenuOpen && (
        <div className={`lg:hidden fixed inset-0 z-[45] ${isAdmin ? 'bg-slate-950' : isProfessional ? 'bg-teal-950' : 'bg-emerald-950'}`}>
          <div className="flex flex-col h-full pt-24 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="px-2 mb-4 text-[11px] font-black uppercase tracking-[0.28em] text-white">Menu</p>
            <div className="flex-1 overflow-y-auto space-y-1">
                {navItems.map(item => <NavLink key={item.name} {...item} isMobile />)}
            </div>
            <div className="pt-4 mt-auto border-t border-white/20">
                <div className="flex items-center gap-4 mb-5 px-1">
                    {user.imageUrl ? <img src={user.imageUrl} className="h-12 w-12 rounded-full border-2 border-white object-cover" /> : <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center"><UserIcon className="h-6 w-6 text-white" /></div>}
                    <div className="min-w-0">
                        <p className="text-white font-bold truncate">{user.name}</p>
                        <p className="text-white text-[11px] uppercase font-black tracking-widest opacity-80">{user.userType}</p>
                    </div>
                </div>
                {onLogout && (
                    <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full py-4 bg-white text-red-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">Sign out</button>
                )}
            </div>
          </div>
        </div>
    )}
    </>
  );
};

export default Header;
