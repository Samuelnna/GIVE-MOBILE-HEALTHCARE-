
import React, { useState, useRef } from 'react';
import { supabase } from '../src/supabaseClient';
import { BellIcon, EnvelopeIcon, DevicePhoneMobileIcon, UserCircleIcon, PencilSquareIcon, CameraIcon } from '../components/IconComponents';
import type { User } from '../types';

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
    </div>
  );
};

export default Profile;
