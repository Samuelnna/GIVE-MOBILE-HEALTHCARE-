import { useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen, AppText, Button, Chip, Input, NavHeader } from '@/src/components/ui';
import { useAuth } from '@/src/contexts/AuthContext';
import { useToast } from '@/src/contexts/ToastContext';
import { authFormError } from '@/src/lib/validate';
import { colors } from '@/src/lib/theme';

const ROLES = ['Doctor (MDCN)', 'Pharmacist (PCN)', 'Lab Scientist (MLSCN)', 'Nurse (NMCN)', 'Other'];

export default function ProfessionalSignUp() {
  const { signUpProfessional } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState(ROLES[0]);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseAsset, setLicenseAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selfieAsset, setSelfieAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const pick = async (kind: 'license' | 'selfie') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    if (kind === 'license') setLicenseAsset(result.assets[0]);
    else setSelfieAsset(result.assets[0]);
  };

  const continueBasic = () => {
    const error = authFormError(email, password, { requireName: true, name: fullName });
    if (error) {
      toast('Check your details', error, 'warning');
      return;
    }
    setStep(1);
  };

  const submit = async () => {
    if (!confirmed) {
      toast('Confirmation required', 'Please confirm your license is valid', 'warning');
      return;
    }
    if (!licenseNumber.trim()) {
      toast('License required', 'Enter your license or practice number.', 'warning');
      return;
    }
    if (!licenseAsset || !selfieAsset) {
      toast('Files required', 'Please upload both your license and a selfie', 'warning');
      return;
    }
    try {
      setLoading(true);
      await signUpProfessional({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        licenseNumber,
        licenseAsset,
        selfieAsset,
      });
      router.replace('/pending');
    } catch (error: any) {
      toast('Signup failed', error.message || 'Please try again', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <NavHeader onBack={() => (step === 0 ? router.back() : setStep(step - 1))} />
      <AppText size={13} weight="800" color={colors.sky}>STEP {step + 1} OF 3</AppText>
      {step === 0 && (
        <>
          <AppText size={28} weight="800" style={{ marginTop: 6, marginBottom: 20 }}>Professional info</AppText>
          <Input autoCapitalize="none" keyboardType="email-address" placeholder="Email address" value={email} onChangeText={setEmail} />
          <Input placeholder="Password (min. 8 characters)" value={password} onChangeText={setPassword} secureTextEntry style={{ marginTop: 12 }} />
          <Input placeholder="Full name (as on license)" value={fullName} onChangeText={setFullName} style={{ marginTop: 12 }} />
          <Button title="Continue" variant="sky" onPress={continueBasic} style={{ marginTop: 20 }} />
        </>
      )}
      {step === 1 && (
        <>
          <AppText size={28} weight="800" style={{ marginTop: 6, marginBottom: 16 }}>Role selection</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ROLES.map((item) => (
              <Chip key={item} label={item} active={role === item} onPress={() => setRole(item)} />
            ))}
          </View>
          <Button title="Continue" variant="sky" onPress={() => setStep(2)} style={{ marginTop: 24 }} />
        </>
      )}
      {step === 2 && (
        <>
          <AppText size={28} weight="800" style={{ marginTop: 6, marginBottom: 16 }}>Verify credentials</AppText>
          <Input label="License / practice number" placeholder="License number" value={licenseNumber} onChangeText={setLicenseNumber} />
          <UploadTile label="License / ID card" asset={licenseAsset} onPress={() => pick('license')} />
          <UploadTile label="Photograph" asset={selfieAsset} onPress={() => pick('selfie')} />
          <View style={styles.confirm}>
            <Switch value={confirmed} onValueChange={setConfirmed} trackColor={{ true: colors.sky }} />
            <Text style={styles.confirmText}>I confirm this is my valid, active license</Text>
          </View>
          <Button title={loading ? 'Uploading...' : 'Submit for verification'} variant="sky" loading={loading} onPress={submit} />
        </>
      )}
    </Screen>
  );
}

function UploadTile({ label, asset, onPress }: { label: string; asset: ImagePicker.ImagePickerAsset | null; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.upload}>
      {asset ? <Image source={{ uri: asset.uri }} style={styles.preview} /> : <Ionicons name="cloud-upload-outline" size={22} color={colors.sky} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.uploadLabel}>{label}</Text>
        <Text style={styles.uploadHint}>{asset ? 'Tap to replace' : 'JPG/PNG, max 5MB'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  upload: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.line, marginTop: 12, marginBottom: 8 },
  preview: { width: 48, height: 48, borderRadius: 12 },
  uploadLabel: { fontWeight: '800', color: colors.ink },
  uploadHint: { color: colors.muted, fontWeight: '600', fontSize: 12, marginTop: 2 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.skySoft, padding: 14, borderRadius: 16, marginVertical: 16 },
  confirmText: { flex: 1, color: colors.ink, fontWeight: '600' },
});
