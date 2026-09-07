
import React, { useState, useRef } from 'react';
import { supabase } from '../src/supabaseClient';
import { BellIcon, EnvelopeIcon, DevicePhoneMobileIcon, UserCircleIcon, PencilSquareIcon, CameraIcon, CreditCardIcon, CheckCircleOutlineIcon, InformationCircleIcon } from '../components/IconComponents';
import type { User } from '../types';
import { flwService } from '../services/flutterwave';
import { createSubaccountAction } from '../app/actions/subaccount';

interface PayoutModalProps {
    onClose: () => void;
    onSave: (values: { bank_code: string; account_number: string }) => void;
    isSaving: boolean;
}

const PayoutModal: React.FC<PayoutModalProps> = ({ onClose, onSave, isSaving }) => {
    const [bankCode, setBankCode] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const banks = flwService.getBanks();

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Configure Payout Account</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Your Bank</label>
                        <select 
                            value={bankCode} 
                            onChange={e => setBankCode(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Select Bank</option>
                            {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
                        <input 
                            type="text" 
                            maxLength={10}
                            value={accountNumber} 
                            onChange={e => setAccountNumber(e.target.value)}
                            placeholder="10-digit NUBAN"
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="p-4 bg-sky-50 rounded-lg border border-sky-100">
                        <p className="text-xs text-sky-800">By submitting, you agree to our automated revenue settlement terms. Funds will be settled to this account after platform commissions.</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 font-medium">Cancel</button>
                    <button 
                        disabled={isSaving || !bankCode || accountNumber.length !== 10}
                        onClick={() => onSave({ bank_code: bankCode, account_number: accountNumber })}
                        className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-medium disabled:bg-slate-300 flex items-center justify-center gap-2"
                    >
                        {isSaving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Connecting...</> : 'Save & Active'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface ProfileProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const ToggleSwitch: React.FC<{ enabled: boolean; setEnabled: (enabled: boolean) => void }> = ({ enabled, setEnabled }) => (
  <button
    onClick={() => setEnabled(!enabled)}
    className={`${enabled ? 'bg-sky-600' : 'bg-slate-300'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
  >
    <span
      className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
    />
  </button>
);

const NotificationPreferenceRow: React.FC<{ title: string }> = ({ title }) => {
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [smsEnabled, setSmsEnabled] = useState(false);
    return (
        <div className="grid grid-cols-4 items-center py-4 border-b border-slate-200 last:border-b-0">
            <p className="font-medium text-slate-700">{title}</p>
            <div className="flex justify-center"><ToggleSwitch enabled={pushEnabled} setEnabled={setPushEnabled} /></div>
            <div className="flex justify-center"><ToggleSwitch enabled={emailEnabled} setEnabled={setEmailEnabled} /></div>
            <div className="flex justify-center"><ToggleSwitch enabled={smsEnabled} setEnabled={setSmsEnabled} /></div>
        </div>
    );
};


const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [formData, setFormData] = useState({ name: user.name, email: user.email });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(user.imageUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        let finalImageUrl = user.imageUrl;

        // 1. If there's a new image file, upload it
        if (profileImageFile) {
            console.log('Profile: Uploading image...', profileImageFile.name);
            const fileExt = profileImageFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, profileImageFile, { 
                    upsert: true,
                    cacheControl: '3600'
                });
            
            if (uploadError) {
                console.error('Profile: Upload error:', uploadError);
                throw uploadError;
            }

            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
            finalImageUrl = publicUrlData.publicUrl;
            console.log('Profile: New image URL:', finalImageUrl);
        }

        // 2. Update profiles table
        console.log('Profile: Updating profiles table...');
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: formData.name,
                email: formData.email,
                image_url: finalImageUrl // Use correct snake_case column name
            } as any)
            .eq('id', user.id);
        
        if (profileError) throw profileError;

        // 3. If professional, also update verification selfie
        if (user.userType === 'professional' && finalImageUrl !== user.imageUrl) {
            console.log('Profile: Updating professional_verifications table...');
            const { error: verError } = await supabase
                .from('professional_verifications')
                .update({ selfie_url: finalImageUrl } as any)
                .eq('user_id', user.id);
            if (verError) console.error('Error updating verification selfie:', verError);
        }

        const updatedUser: User = {
            ...user,
            name: formData.name,
            email: formData.email,
            imageUrl: finalImageUrl,
        };

        onUpdateUser(updatedUser);
        setIsEditing(false);
    } catch (e: any) {
        alert(`Error saving profile: ${e.message}. Make sure 'avatars' bucket is public.`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: user.name, email: user.email });
    setImagePreview(user.imageUrl || null);
    setProfileImageFile(null);
    setIsEditing(false);
  };

  const handleSetupPayout = async (bankDetails: { bank_code: string; account_number: string }) => {
    if (user.subaccount_id) {
        alert('Payout account is already configured.');
        return;
    }

    setIsSavingPayout(true);
    try {
        console.log('Profile: Setting up subaccount...');
        
        // 1. Create subaccount via Flutterwave Server Action
        // We use a fixed 0.3 split for doctors (meaning 30% goes to main account)
        const flwRes = await createSubaccountAction({
            account_bank: bankDetails.bank_code,
            account_number: bankDetails.account_number,
            business_name: user.name,
            business_email: user.email,
            business_mobile: '08000000000', // In production, use user's phone
            split_value: 0.3
        });

        if (!flwRes.success) throw new Error(flwRes.error);

        // 2. Update Supabase profile
        const bankName = flwService.getBanks().find(b => b.code === bankDetails.bank_code)?.name || 'Unknown Bank';
        const bankData = {
            bank_name: bankName,
            bank_code: bankDetails.bank_code,
            account_number: bankDetails.account_number,
            account_name: user.name
        };

        const { error: dbError } = await supabase
            .from('profiles')
            .update({
                subaccount_id: flwRes.subaccount_id,
                bank_details: bankData
            } as any)
            .eq('id', user.id);

        if (dbError) throw dbError;

        // 3. Update local state
        const updatedUser: User = {
            ...user,
            subaccount_id: flwRes.subaccount_id,
            bank_details: bankData
        };
        onUpdateUser(updatedUser);
        setShowPayoutModal(false);
        alert('Payout account configured successfully! You will now receive automated settlements.');
    } catch (err: any) {
        alert(`Failed to setup payout: ${err.message}`);
    } finally {
        setIsSavingPayout(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white p-8 rounded-lg shadow-md mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="relative group">
                {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="h-24 w-24 rounded-full object-cover border-4 border-slate-100" />
                ) : (
                    <UserCircleIcon className="h-24 w-24 text-slate-300" />
                )}
                {isEditing && (
                    <>
                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Change profile picture"
                        >
                            <CameraIcon className="h-8 w-8" />
                        </button>
                    </>
                )}
            </div>
            <div className="flex-grow">
                 {isEditing ? (
                    <div className="space-y-2">
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full max-w-xs text-3xl font-bold text-slate-800 border-b-2 border-sky-300 focus:border-sky-500 outline-none bg-transparent"
                        />
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full max-w-xs text-slate-600 border-b-2 border-sky-300 focus:border-sky-500 outline-none bg-transparent"
                        />
                    </div>
                 ) : (
                    <>
                        <h1 className="text-3xl font-bold text-slate-800">{user.name}</h1>
                        <p className="text-slate-600 mt-1">{user.email}</p>
                    </>
                 )}
                <p className="text-sm font-semibold text-sky-600 bg-sky-100 px-3 py-1 rounded-full inline-block mt-2">Hospital ID: {user.hospitalId}</p>
            </div>
            <div className="sm:ml-auto flex-shrink-0">
                {isEditing ? (
                    <div className="flex gap-2">
                        <button disabled={isSaving} onClick={handleCancel} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50">Cancel</button>
                        <button disabled={isSaving} onClick={handleSave} className="px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors disabled:bg-slate-400 flex items-center gap-2">
                            {isSaving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Saving...</> : 'Save Changes'}
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                        <PencilSquareIcon className="h-5 w-5" />
                        Edit Profile
                    </button>
                )}
            </div>
        </div>
      </div>
      
      {user.userType === 'professional' && (
        <div className="bg-white rounded-lg shadow-md mb-8 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
                <h2 className="text-2xl font-bold text-slate-700 flex items-center gap-2">
                    <CreditCardIcon className="h-6 w-6 text-emerald-600" />
                    Revenue Sharing & Payments
                </h2>
                <p className="text-slate-500 mt-1">Manage how you receive your share of consultation and service fees.</p>
            </div>
            <div className="p-6">
                {user.subaccount_id ? (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="bg-emerald-500 p-2 rounded-full">
                                <CheckCircleOutlineIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-emerald-900 text-lg">Subaccount Active</p>
                                <p className="text-emerald-700">Your revenue share is automatically split and settled to your bank account.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Flutterwave Subaccount ID</p>
                                <p className="font-mono text-lg text-slate-700">{user.subaccount_id}</p>
                            </div>
                            {(user.bank_details || (user as any).bank_code) && (
                                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Settlement Bank Account</p>
                                    <p className="font-bold text-slate-700">
                                        {user.bank_details?.bank_name || user.bank_details?.bank_code || (user as any).bank_code || 'Linked Bank'}
                                    </p>
                                    <p className="text-slate-600">
                                        {user.bank_details?.account_number || (user as any).account_number || '********'} • {user.bank_details?.account_name || user.name}
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-sky-50 rounded-lg border border-sky-100 flex gap-3">
                            <InformationCircleIcon className="h-5 w-5 text-sky-600 flex-shrink-0" />
                            <p className="text-sm text-sky-800">To change your settlement bank details, please contact our provider relations team at <span className="font-bold">support@givehealthcare.com</span>.</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="bg-slate-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CreditCardIcon className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Setup Your Payout Account</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                            You haven't configured your settlement bank account yet. To start receiving your share of payments automatically, we need to set up your Flutterwave subaccount.
                        </p>
                        <button 
                            onClick={() => setShowPayoutModal(true)}
                            className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                        >
                            Configure Payout Settings
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-slate-200">
             <h2 className="text-2xl font-bold text-slate-700">Notification Preferences</h2>
             <p className="text-slate-500 mt-1">Choose how you want to be notified.</p>
        </div>
        <div className="p-6">
            <div className="grid grid-cols-4 text-center font-semibold text-slate-600 mb-4">
                <span></span>
                <div className="flex justify-center items-center gap-2"><BellIcon className="h-5 w-5"/><span>Push</span></div>
                <div className="flex justify-center items-center gap-2"><EnvelopeIcon className="h-5 w-5"/><span>Email</span></div>
                <div className="flex justify-center items-center gap-2"><DevicePhoneMobileIcon className="h-5 w-5"/><span>SMS</span></div>
            </div>
            
            <NotificationPreferenceRow title="Appointment Reminders" />
            <NotificationPreferenceRow title="New Messages" />
            <NotificationPreferenceRow title="Lab Results Ready" />
            <NotificationPreferenceRow title="Prescription Updates" />
            <NotificationPreferenceRow title="Platform Announcements" />
        </div>
      </div>
      {showPayoutModal && (
          <PayoutModal 
            isSaving={isSavingPayout} 
            onClose={() => setShowPayoutModal(false)} 
            onSave={handleSetupPayout} 
          />
      )}
    </div>
  );
};

export default Profile;
