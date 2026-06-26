import React, { useState } from 'react';
import { HospitalIcon, SparklesIcon, ArrowLeftIcon } from './components/IconComponents';
import type { User } from './types';
import { supabase } from './src/supabaseClient';
import { useNotification } from './contexts/NotificationContext';

interface AuthProps {
  onLogin: (user: User, isSignUp: boolean) => void;
  onProfessionalSignUp: (user: User, details: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onProfessionalSignUp }) => {
  const [authStep, setAuthStep] = useState<'initial' | 'login' | 'patient_signup' | 'prof_signup_basic' | 'prof_signup_role' | 'prof_signup_license' | 'patient_portal' | 'prof_portal' | 'admin_portal'>('initial');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profRole, setProfRole] = useState('Doctor (MDCN)');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [selfieFile, setSelfFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addNotification } = useNotification();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single();

      // If profile doesn't exist yet, we can create a skeleton one or use auth meta
      let userType = profileData?.user_type || data.user?.user_metadata?.user_type || 'patient';
      
      // HARD OVERRIDE FOR ADMIN EMAIL
      if (data.user?.email === 'admin@givehealthcare.com') {
        userType = 'admin';
      }

      console.log('Login Debug - User Type:', userType, 'Email:', data.user?.email);
      
      const user: User = {
        id: data.user?.id || '',
        name: profileData?.full_name || data.user?.user_metadata?.full_name || 'User',
        email: data.user?.email || '',
        hospitalId: profileData?.hospital_id || `MH-${Math.floor(10000000 + Math.random() * 90000000)}`,
        userType: userType,
        imageUrl: profileData?.image_url || null,
        status: profileData?.status || (userType === 'admin' ? 'active' : (userType === 'professional' ? 'pending' : 'active')),
      };
      
      onLogin(user, false);
    } catch (error) {
      console.error('Authentication Error:', error);
      addNotification('Authentication Failed', (error as Error).message, 'error');
    }
  };

  const handlePatientSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: 'patient'
          }
        }
      });
      if (error) throw error;
      
      const newUser: User = {
        id: data.user?.id || '',
        name: fullName,
        email: email,
        hospitalId: `MH-${Math.floor(10000000 + Math.random() * 90000000)}`,
        userType: 'patient',
        status: 'active'
      };
      onLogin(newUser, true);
    } catch (error) {
      addNotification('Signup Failed', (error as Error).message, 'error');
    }
  };

  const handleProfessionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseConfirmed) {
      addNotification('Confirmation required', 'Please confirm your license is valid', 'warning');
      return;
    }
    if (!licenseFile || !selfieFile) {
      addNotification('Files required', 'Please upload both your license and a selfie', 'warning');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let signupResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: 'professional',
            role: profRole
          }
        }
      });

      // Handle "User already registered" - common if first attempt failed at profile stage
      if (signupResult.error?.message?.includes('already registered')) {
        console.log('User exists in Auth, attempting to recover session...');
        signupResult = await supabase.auth.signInWithPassword({ email, password });
      }

      if (signupResult.error) throw signupResult.error;
      const data = signupResult.data;
      if (!data.user) throw new Error('User identification failed');

      const userId = data.user.id;

      // 1. Upload License
      const licensePath = `${userId}/license_${Date.now()}`;
      const { data: licenseUpload, error: licenseError } = await supabase.storage
        .from('licenses')
        .upload(licensePath, licenseFile);
      if (licenseError) throw licenseError;

      // 2. Upload Selfie
      const selfiePath = `${userId}/selfie_${Date.now()}`;
      const { data: selfieUpload, error: selfieError } = await supabase.storage
        .from('selfies')
        .upload(selfiePath, selfieFile);
      if (selfieError) throw selfieError;

      // Get public URLs
      const { data: { publicUrl: licenseUrl } } = supabase.storage.from('licenses').getPublicUrl(licensePath);
      const { data: { publicUrl: selfieUrl } } = supabase.storage.from('selfies').getPublicUrl(selfiePath);

      // Check if profile was created by trigger, if not, create it (self-healing)
      // We'll try up to 3 times with a small delay to account for trigger lag
      let profileExists = false;
      for (let i = 0; i < 3; i++) {
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();
        
        if (profileCheck) {
          profileExists = true;
          break;
        }
        // Small delay before next check
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!profileExists) {
        console.log('Profile still missing after retries, creating manually...');
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: fullName,
            email: email,
            user_type: 'professional',
            role: profRole,
            status: 'pending'
          });
        if (profileError) {
          console.error('Manual profile creation failed. Details:', JSON.stringify(profileError, null, 2));
          // If we can't create the profile, the next step WILL fail, so we should report this
          throw new Error(`Profile creation failed: ${profileError.message} (${profileError.code})`);
        }
      }

      // Using upsert to handle potential retries or existing partial records
      const { error: verifyError } = await supabase
        .from('professional_verifications')
        .upsert({
          user_id: userId,
          license_number: licenseNumber,
          license_document_url: licenseUrl,
          selfie_url: selfieUrl,
          status: 'pending'
        }, {
            onConflict: 'user_id'
        });
        
      if (verifyError) {
        console.error('Verification insertion failed', verifyError);
        throw new Error(`Database error saving verification: ${verifyError.message} (${verifyError.code})`);
      }

      const newUser: User = {
        id: data.user?.id || '',
        name: fullName,
        email: email,
        hospitalId: `MH-${Math.floor(10000000 + Math.random() * 90000000)}`,
        userType: 'professional',
        status: 'pending'
      };
      onLogin(newUser, true);
    } catch (error) {
      console.error('Signup Error:', error);
      addNotification('Signup Failed', (error as Error).message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInitialScreen = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">SELECT YOUR ROLE</h2>
      <button
        onClick={() => setAuthStep('patient_portal')}
        className="w-full bg-emerald-50 border-2 border-emerald-200 text-emerald-800 font-bold py-4 px-4 rounded-xl hover:bg-emerald-100 hover:border-emerald-300 transition-all flex items-center justify-center gap-3 shadow-sm transform hover:-translate-y-1"
      >
        <span className="text-2xl">👤</span> I'M A PATIENT
      </button>
      <button
        onClick={() => setAuthStep('prof_portal')}
        className="w-full bg-blue-50 border-2 border-blue-200 text-blue-800 font-bold py-4 px-4 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-all flex items-center justify-center gap-3 shadow-sm transform hover:-translate-y-1 mt-4"
      >
        <span className="text-2xl">⚕️</span> I'M A HEALTHCARE PROFESSIONAL
      </button>
      
    </div>
  );

  const renderAdminPortal = () => (
    <div className="space-y-4">
      <button onClick={() => setAuthStep('initial')} className="mb-4 text-slate-600 hover:text-slate-800 flex items-center gap-1 text-sm font-bold transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back to Roles
      </button>
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Admin Portal</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Admin Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all bg-slate-50 focus:bg-white"
          required
        />
        <input
          type="password"
          placeholder="Admin Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 outline-none transition-all bg-slate-50 focus:bg-white"
          required
        />
        <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 px-4 rounded-xl hover:bg-slate-900 transition-colors shadow-md mt-6">
          Log In as Admin
        </button>
      </form>
    </div>
  );

  const renderPatientPortal = () => (
    <div className="space-y-4">
      <button onClick={() => setAuthStep('initial')} className="mb-4 text-emerald-600 hover:text-emerald-800 flex items-center gap-1 text-sm font-bold transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back to Roles
      </button>
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Patient Portal</h2>
      <button
        onClick={() => setAuthStep('login')}
        className="w-full bg-slate-800 text-white font-bold py-4 px-4 rounded-xl hover:bg-slate-900 transition-colors shadow-md"
      >
        LOG IN
      </button>
      <button
        onClick={() => setAuthStep('patient_signup')}
        className="w-full bg-emerald-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-md mt-4"
      >
        CREATE NEW ACCOUNT
      </button>
    </div>
  );

  const renderProfPortal = () => (
    <div className="space-y-4">
      <button onClick={() => setAuthStep('initial')} className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back to Roles
      </button>
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Professional Portal</h2>
      <button
        onClick={() => setAuthStep('login')}
        className="w-full bg-slate-800 text-white font-bold py-4 px-4 rounded-xl hover:bg-slate-900 transition-colors shadow-md"
      >
        LOG IN
      </button>
      <button
        onClick={() => setAuthStep('prof_signup_basic')}
        className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-xl hover:bg-blue-700 transition-colors shadow-md mt-4"
      >
        CREATE NEW ACCOUNT
      </button>
    </div>
  );

  const renderLogin = () => (
    <div className="space-y-4">
      <button onClick={() => setAuthStep('initial')} className="mb-4 text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm font-bold transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </button>
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Welcome Back</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white text-slate-800 font-medium"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-5 py-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white text-slate-800 font-medium"
          required
        />
        <button type="submit" className="w-full bg-emerald-600 text-white font-extrabold py-4 px-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] mt-6 tracking-wide">
          Sign In
        </button>
      </form>
    </div>
  );

  const renderPatientSignUp = () => (
    <div className="space-y-4">
      <button onClick={() => setAuthStep('patient_portal')} className="mb-4 text-emerald-600 hover:text-emerald-800 flex items-center gap-1 text-sm font-bold transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </button>
      <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Patient Registration</h2>
      <form onSubmit={handlePatientSignUp} className="space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white"
          required
        />
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-slate-50 focus:bg-white"
          required
        />
        <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-md mt-6">
          Create Patient Account
        </button>
      </form>
    </div>
  );

  const renderProfBasic = () => (
    <div className="space-y-4">
      <button onClick={() => setAuthStep('prof_portal')} className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </button>
      <h2 className="text-xl font-bold text-center text-slate-800 mb-6">Professional Info</h2>
      <div className="space-y-4">
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
          required
        />
        <input
          type="text"
          placeholder="Full name (as on license)"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
          required
        />
        <button onClick={() => setAuthStep('prof_signup_role')} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors shadow-md mt-6">
          Continue
        </button>
      </div>
    </div>
  );

  const renderProfRole = () => (
    <div className="space-y-4">
      <button onClick={() => setAuthStep('prof_signup_basic')} className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </button>
      <h2 className="text-xl font-bold text-center text-slate-800 mb-6">Role Selection</h2>
      <select 
        value={profRole} 
        onChange={(e) => setProfRole(e.target.value)}
        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
      >
        <option>Doctor (MDCN)</option>
        <option>Pharmacist (PCN)</option>
        <option>Lab Scientist (MLSCN)</option>
        <option>Nurse (NMCN)</option>
        <option>Other</option>
      </select>
      <button onClick={() => setAuthStep('prof_signup_license')} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors shadow-md mt-6">
        Continue
      </button>
    </div>
  );

  const renderProfLicense = () => (
    <div className="space-y-4">
      <button onClick={() => setAuthStep('prof_signup_role')} className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-bold transition-colors">
        <ArrowLeftIcon className="h-4 w-4" /> Back
      </button>
      <h2 className="text-xl font-bold text-center text-slate-800 mb-6 uppercase">Verify Credentials</h2>
      <form onSubmit={handleProfessionalSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">License/Practice Number:</label>
          <input
            type="text"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-slate-50 focus:bg-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Upload License/ID Card: <span className="text-xs text-slate-500 font-normal">(JPG/PNG, max 5MB)</span></label>
          <input 
            type="file" 
            onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            required
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Upload Photograph:</label>
          <input 
            type="file" 
            onChange={(e) => setSelfFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            required
          />
        </div>
        <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
          <input 
            type="checkbox" 
            id="confirm_license" 
            checked={licenseConfirmed}
            onChange={(e) => setLicenseConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
          />
          <label htmlFor="confirm_license" className="text-sm text-slate-800 font-medium">I confirm this is my valid, active license</label>
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors shadow-md mt-4 disabled:bg-slate-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              UPLOADING & SAVING...
            </>
          ) : 'SUBMIT FOR VERIFICATION'}
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col justify-center items-center p-4 selection:bg-emerald-100 selection:text-emerald-900">
      <div className="max-w-md w-full">
        <div className="flex flex-col justify-center items-center gap-3 mb-8">
          <div className="bg-white p-2 rounded-2xl shadow-sm">
            <img src="/logo.jpeg" alt="GIVE Logo" className="h-20 w-20 rounded-xl object-cover" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight text-center">
            GIVE Mobile Healthcare
          </h1>
          <p className="text-emerald-700 text-sm text-center font-bold tracking-wide uppercase italic">healthcare everywhere you go</p>
        </div>
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-emerald-500/5 border border-slate-100 transition-all duration-300">
          {authStep === 'initial' && renderInitialScreen()}
          {authStep === 'admin_portal' && renderAdminPortal()}
          {authStep === 'patient_portal' && renderPatientPortal()}
          {authStep === 'prof_portal' && renderProfPortal()}
          {authStep === 'login' && renderLogin()}
          {authStep === 'patient_signup' && renderPatientSignUp()}
          {authStep === 'prof_signup_basic' && renderProfBasic()}
          {authStep === 'prof_signup_role' && renderProfRole()}
          {authStep === 'prof_signup_license' && renderProfLicense()}
        </div>
      </div>
    </div>
  );
};

export default Auth;
