import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import { useNotification } from '../contexts/NotificationContext';

interface EntityModalProps {
  title: string;
  fields: { name: string; label: string; type?: string; options?: { value: any; label: string }[] }[];
  onClose: () => void;
  onSave: (values: any) => void;
  isUploading?: boolean;
}

const EntityModal: React.FC<EntityModalProps> = ({ title, fields, onClose, onSave, isUploading = false }) => {
  const [values, setValues] = useState<any>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const finalValues = { ...values };
    
    // Check if there's a file input
    const fileInput = (e.currentTarget as HTMLFormElement).querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput && fileInput.files?.[0]) {
        finalValues.imageFile = fileInput.files[0];
    }
    
    onSave(finalValues);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
              {f.type === 'select' ? (
                  <select
                    required
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500"
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                  >
                      <option value="">Select {f.label}</option>
                      {f.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
              ) : f.type === 'file' ? (
                <input
                    type="file"
                    accept="image/*"
                    required
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700"
                />
              ) : (
                <input
                    type={f.type || 'text'}
                    required
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-sky-500"
                    onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 font-medium disabled:bg-slate-400 flex items-center justify-center gap-2"
            >
              {isUploading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Saving...</> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<{ allPayments?: any[] }> = ({ allPayments: initialPayments = [] }) => {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [dbPayments, setDbPayments] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [labAppointments, setLabAppointments] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [pharmacyOrders, setPharmacyOrders] = useState<any[]>([]);
  const [isLoadingLab, setIsLoadingLab] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showLabTestModal, setShowLabTestModal] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any | null>(null);
  const [healthTopics, setHealthTopics] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showManualResultModal, setShowManualResultModal] = useState(false);
  const [selectedApptForResult, setSelectedApptForResult] = useState<any | null>(null);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  const { addNotification } = useNotification();

  useEffect(() => {
    fetchVerifications();
    fetchHospitals();
    fetchPharmacies();
    fetchMedications();
    fetchLabs();
    fetchLabTests();
    fetchLabAppointments();
    fetchLabResults();
    fetchPharmacyOrders();
    fetchHealthTopics();
    fetchReferrals();
    fetchPrescriptions();
    fetchHospAppts();
    fetchAllProfiles();
    fetchPayments();

    const payChannel = supabase.channel('admin_payments_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, fetchPayments)
        .subscribe();
    
    return () => { supabase.removeChannel(payChannel); };
  }, []);

  const fetchPayments = async () => {
    console.log('AdminDashboard: Fetching all payments...');
    const { data, error } = await supabase
        .from('payments')
        .select(`
            *,
            profiles!payments_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('AdminDashboard: Payment fetch error:', error);
        // Try simpler fetch if join fails
        const { data: simpleData } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
        if (simpleData) setDbPayments(simpleData);
    } else if (data) {
        setDbPayments(data);
    }
  };

  const fetchAllProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email').eq('user_type', 'patient');
    if (data) setAllProfiles(data);
  };

  const fetchHealthTopics = async () => {
    const { data, error } = await supabase.from('health_topics').select('*').order('published_at', { ascending: false });
    if (!error) setHealthTopics(data || []);
  };

  const fetchHospitals = async () => {
    const { data, error } = await supabase.from('hospitals').select('*').order('created_at', { ascending: false });
    if (!error) setHospitals(data || []);
  };

  const fetchPharmacies = async () => {
    const { data, error } = await supabase.from('pharmacies').select('*').order('created_at', { ascending: false });
    if (!error) setPharmacies(data || []);
  };

  const fetchMedications = async () => {
    const { data, error } = await supabase.from('medications').select('*, pharmacies(name)').order('created_at', { ascending: false });
    if (!error) setMedications(data || []);
  };

  const fetchLabs = async () => {
    const { data, error } = await supabase.from('labs').select('*').order('created_at', { ascending: false });
    if (!error) setLabs(data || []);
  };

  const fetchLabTests = async () => {
    const { data, error } = await supabase.from('lab_tests').select('*, labs(name)').order('created_at', { ascending: false });
    if (!error) setLabTests(data || []);
  };

  const fetchLabAppointments = async () => {
    try {
        // Use a cleaner join syntax
        const { data, error } = await supabase
            .from('lab_appointments')
            .select(`
                *,
                profiles!lab_appointments_patient_id_fkey(full_name),
                lab_tests!lab_appointments_lab_test_id_fkey(name),
                labs!lab_appointments_lab_id_fkey(name)
            `)
            .order('date', { ascending: false });
            
        if (error) {
            // Fallback for simple fetch if join fails due to complex schema
            const { data: simpleData, error: simpleError } = await supabase.from('lab_appointments').select('*').order('date', { ascending: false });
            if (simpleError) throw simpleError;
            
            // Manually enrich if needed, but let's try to get data first
            setLabAppointments(simpleData || []);
        } else {
            setLabAppointments(data || []);
        }
    } catch (e) {
        console.error('Error fetching lab appointments:', e);
    } finally {
        setIsLoadingLab(false);
    }
  };

  const fetchLabResults = async () => {
    const { data, error } = await supabase.from('lab_results').select('*, profiles(full_name), labs(name)').order('created_at', { ascending: false });
    if (!error) setLabResults(data || []);
  };

  const fetchPharmacyOrders = async () => {
    const { data, error } = await supabase.from('pharmacy_orders').select('*, profiles(full_name), items:pharmacy_order_items(*, medication:medications(name))').order('created_at', { ascending: false });
    if (!error) setPharmacyOrders(data || []);
  };

  const [hospAppts, setHospAppts] = useState<any[]>([]);
  const fetchHospAppts = async () => {
      const { data } = await supabase.from('hospital_appointments').select('*, profiles(full_name), hospitals(name)').order('date', { ascending: false });
      if (data) setHospAppts(data);
  };

  const fetchReferrals = async () => {
    const { data, error } = await supabase
        .from('referrals')
        .select('*, patient:profiles!referrals_patient_id_fkey(full_name), doctor:profiles!referrals_doctor_id_fkey(full_name), hospital:hospitals(name), lab:labs(name)')
        .order('created_at', { ascending: false });
    if (!error) setReferrals(data || []);
  };

  const fetchPrescriptions = async () => {
    const { data, error } = await supabase
        .from('prescriptions')
        .select('*, patient:profiles!prescriptions_patient_id_fkey(full_name), doctor:profiles!prescriptions_doctor_id_fkey(full_name), medication:medications(name), pharmacy:pharmacies(name)')
        .order('created_at', { ascending: false });
    if (!error) setPrescriptions(data || []);
  };

  const fetchVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('professional_verifications')
        .select(`
          *,
          profiles (
            full_name,
            email,
            role
          )
        `)
        .eq('status', 'pending');
        
      if (error) {
        const { data: vData, error: vError } = await supabase
          .from('professional_verifications')
          .select('*')
          .eq('status', 'pending');
          
        if (vError) throw vError;
        
        const verificationsWithProfiles = await Promise.all((vData || []).map(async (v) => {
          const { data: pData } = await supabase
            .from('profiles')
            .select('full_name, email, role')
            .eq('id', v.user_id)
            .single();
          return { ...v, profiles: pData };
        }));
        
        setVerifications(verificationsWithProfiles);
      } else {
        setVerifications(data || []);
      }
    } catch (err) {
      addNotification('Admin Fetch Error', (err as Error).message, 'error');
    }
  };

  const handleDelete = async (table: string, id: string, refreshFn: () => void) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) addNotification('Error', error.message, 'error');
    else {
        addNotification('Success', 'Deleted successfully', 'success');
        refreshFn();
    }
  };

  const handleApprove = async (id: string, userId: string) => {
    try {
      await supabase.from('professional_verifications').update({ status: 'approved' }).eq('id', id);
      await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);
      addNotification('Success', 'Professional approved', 'success');
      fetchVerifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: string, userId: string) => {
    try {
      await supabase.from('professional_verifications').update({ status: 'rejected' }).eq('id', id);
      await supabase.from('profiles').update({ status: 'rejected' }).eq('id', userId);
      addNotification('Success', 'Professional rejected', 'success');
      fetchVerifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePublishBlog = async (values: any) => {
    setIsUploading(true);
    try {
        let imageUrl = editingBlog?.image_url || '';
        
        if (values.imageFile) {
            const file = values.imageFile;
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${fileName}`; // Upload directly to root of bucket for simplicity

            const { error: uploadError } = await supabase.storage
                .from('blog-images')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('blog-images')
                .getPublicUrl(filePath);
            
            imageUrl = data.publicUrl;
            console.log('Generated Public URL:', imageUrl);
        }

        const blogData = {
            title: values.title,
            category: values.category,
            content: values.content,
            author_name: values.author_name || 'Admin',
            image_url: imageUrl,
            published_at: editingBlog ? editingBlog.published_at : new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        let res;
        if (editingBlog) {
            res = await supabase.from('health_topics').update(blogData).eq('id', editingBlog.id);
        } else {
            res = await supabase.from('health_topics').insert([blogData]);
        }

        if (res.error) throw res.error;

        addNotification('Success', editingBlog ? 'Blog updated!' : 'Blog post published!', 'success');
        setShowBlogModal(false);
        setEditingBlog(null);
        fetchHealthTopics();
    } catch (err: any) {
        addNotification('Publish Error', err.message, 'error');
    } finally {
        setIsUploading(false);
    }
  };

  const displayPayments = dbPayments.length > 0 ? dbPayments : initialPayments;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Administrative Dashboard</h2>
        <button onClick={() => setShowBlogModal(true)} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md">Create New Blog Post</button>
      </div>

      {/* NEW: Prominent Lab Section at Top */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-sky-100">
          <div className="flex justify-between items-center border-b pb-2 mb-4">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span className="bg-sky-600 text-white p-1 rounded">LAB</span> Lab Appointments & Result Delivery
            </h3>
            <div className="flex gap-4 items-center">
                <button 
                    onClick={() => setShowManualResultModal(true)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-black text-xs uppercase hover:bg-emerald-700 transition shadow-md"
                >
                    + Manual Result Upload
                </button>
                <button onClick={() => { fetchLabAppointments(); fetchLabResults(); }} className="text-sky-600 text-xs font-bold hover:underline">Refresh Lab Data</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-3 flex justify-between items-center">
                        Active Lab Appointments
                        <span className="text-[10px] bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full">{labAppointments.length} Total</span>
                    </h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50"><tr className="border-b font-bold text-slate-500 uppercase"><th className="p-3">Patient</th><th className="p-3">Test</th><th className="p-3">Lab</th><th className="p-3 text-right">Action</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {labAppointments.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-bold text-slate-700">{a.profiles?.full_name}</td>
                                        <td className="p-3 text-slate-600">{a.lab_tests?.name}</td>
                                        <td className="p-3 text-slate-500 italic">{a.labs?.name}</td>
                                        <td className="p-3 text-right">
                                            <button 
                                                onClick={() => { setSelectedApptForResult(a); setShowResultModal(true); }}
                                                className="bg-sky-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-sky-700 transition shadow-md active:scale-95"
                                            >
                                                Upload Result
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {labAppointments.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No appointments found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-400 uppercase mb-3 flex justify-between items-center">
                        Recent Published Results
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">{labResults.length} Published</span>
                    </h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50"><tr className="border-b font-bold text-slate-500 uppercase"><th className="p-3">Patient</th><th className="p-3">Test</th><th className="p-3 text-right">Action</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {labResults.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-bold text-slate-700">{r.profiles?.full_name}</td>
                                        <td className="p-3 text-slate-600">{r.test_name}</td>
                                        <td className="p-3 text-right">
                                            <button onClick={() => handleDelete('lab_results', r.id, fetchLabResults)} className="text-red-400 hover:text-red-600 font-bold px-2 py-1">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {labResults.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">No results published yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <h3 className="text-xl font-bold mb-4 border-b pb-2 text-slate-800">PENDING VERIFICATIONS ({verifications.length})</h3>
        
        {verifications.length === 0 ? (
          <p className="text-slate-500">No pending verifications.</p>
        ) : (
          <div className="space-y-4">
            {verifications.map((v) => (
              <div key={v.id} className="border border-slate-200 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between bg-slate-50 gap-4">
                <div>
                  <h4 className="font-bold text-lg text-slate-800">{v.profiles?.full_name}</h4>
                  <p className="text-sm text-slate-600 font-medium">{v.profiles?.role} - <span className="text-slate-500">License: {v.license_number}</span></p>
                  <p className="text-sm text-slate-500 italic">{v.profiles?.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {v.license_document_url && (
                    <a href={v.license_document_url} target="_blank" rel="noreferrer" className="bg-sky-100 text-sky-700 px-3 py-1.5 rounded text-[10px] font-black uppercase hover:bg-sky-200">
                      View License
                    </a>
                  )}
                  {v.selfie_url && (
                    <a href={v.selfie_url} target="_blank" rel="noreferrer" className="bg-sky-100 text-sky-700 px-3 py-1.5 rounded text-[10px] font-black uppercase hover:bg-sky-200">
                      View Photo
                    </a>
                  )}
                  <button onClick={() => handleApprove(v.id, v.user_id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase hover:bg-green-700">✓ APPROVE</button>
                  <button onClick={() => handleReject(v.id, v.user_id)} className="bg-red-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase hover:bg-red-700">✗ REJECT</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Blog Posts Management */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2 flex justify-between items-center">
                Health Topics & Blogs
                <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500 font-bold">{healthTopics.length} Posts</span>
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b text-[10px] uppercase text-slate-400 font-bold"><th className="pb-2">Image</th><th className="pb-2">Title</th><th className="pb-2">Author</th><th className="pb-2">Category</th><th className="pb-2 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {healthTopics.map(blog => (
                            <tr key={blog.id} className="group hover:bg-slate-50 transition-colors">
                                <td className="py-3">
                                    {blog.image_url ? (
                                        <img src={blog.image_url} alt="" className="w-12 h-12 object-cover rounded-lg border border-slate-100" />
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-[10px]">No Img</div>
                                    )}
                                </td>
                                <td className="py-3 max-w-xs truncate font-bold text-slate-700">{blog.title}</td>
                                <td className="py-3 text-slate-500">{blog.author_name}</td>
                                <td className="py-3"><span className="px-2 py-1 bg-sky-50 text-sky-600 rounded-full text-[10px] font-bold">{blog.category}</span></td>
                                <td className="py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setEditingBlog(blog); setShowBlogModal(true); }} className="text-teal-600 hover:text-teal-800 font-bold text-xs">Edit</button>
                                        <button onClick={() => handleDelete('health_topics', blog.id, fetchHealthTopics)} className="text-red-400 hover:text-red-600 font-bold text-xs">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {healthTopics.length === 0 && <p className="text-center py-8 text-slate-400">No blog posts yet. Click the button above to publish your first one!</p>}
            </div>
        </div>

        {/* Referrals Tracking */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Referrals (Hospitals & Labs)</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b text-[10px] uppercase text-slate-400 font-bold"><th className="pb-2">Patient</th><th className="pb-2">Referred By</th><th className="pb-2">Target</th><th className="pb-2">Reason</th><th className="pb-2">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {referrals.map(r => (
                            <tr key={r.id}>
                                <td className="py-3 font-bold text-slate-700">{r.patient?.full_name}</td>
                                <td className="py-3 text-slate-500">{r.doctor?.full_name}</td>
                                <td className="py-3 font-bold text-sky-600">
                                    {r.hospital?.name || r.lab?.name || 'N/A'}
                                    <span className="ml-1 text-[9px] text-slate-400">({r.hospital_id ? 'Hosp' : 'Lab'})</span>
                                </td>
                                <td className="py-3 text-slate-500 max-w-xs truncate">{r.reason}</td>
                                <td className="py-3">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                        r.status === 'scheduled' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {r.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {referrals.length === 0 && <p className="text-center py-4 text-slate-500">No referrals found.</p>}
            </div>
        </div>

        {/* Prescription Tracking */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Medical Prescriptions</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b text-[10px] uppercase text-slate-400 font-bold"><th className="pb-2">Patient</th><th className="pb-2">Doctor</th><th className="pb-2">Medication</th><th className="pb-2">Pharmacy</th><th className="pb-2">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {prescriptions.map(p => (
                            <tr key={p.id}>
                                <td className="py-3 font-bold text-slate-700">{p.patient?.full_name}</td>
                                <td className="py-3 text-slate-500">{p.doctor?.full_name}</td>
                                <td className="py-3 text-slate-600 font-medium">{p.medication?.name} ({p.dosage})</td>
                                <td className="py-3 text-slate-500">{p.pharmacy?.name}</td>
                                <td className="py-3"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase">{p.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {prescriptions.length === 0 && <p className="text-center py-4 text-slate-500">No prescriptions found.</p>}
            </div>
        </div>

        {/* Hospital Appointments Tracking */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Hospital Appointments</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b text-[10px] uppercase text-slate-400 font-bold"><th className="pb-2">Patient</th><th className="pb-2">Hospital</th><th className="pb-2">Service</th><th className="pb-2">Date/Time</th><th className="pb-2">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {hospAppts.map(a => (
                            <tr key={a.id}>
                                <td className="py-3 font-bold text-slate-700">{a.profiles?.full_name}</td>
                                <td className="py-3 text-slate-600">{a.hospitals?.name}</td>
                                <td className="py-3 text-slate-500">{a.service_name}</td>
                                <td className="py-3 text-slate-500">{a.date} at {a.time}</td>
                                <td className="py-3"><span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-[10px] font-bold uppercase">{a.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {hospAppts.length === 0 && <p className="text-center py-4 text-slate-500">No hospital appointments found.</p>}
            </div>
        </div>


        {/* Payment History Tracking */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Financial Transactions (Payments)</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b text-[10px] uppercase text-slate-400 font-bold"><th className="pb-2">User</th><th className="pb-2">Amount</th><th className="pb-2">Type</th><th className="pb-2">Reference</th><th className="pb-2">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {displayPayments.map(p => (
                            <tr key={p.id}>
                                <td className="py-3 font-bold text-slate-700">{p.profiles?.full_name}</td>
                                <td className="py-3 font-bold text-emerald-600">₦{Number(p.amount).toLocaleString()}</td>
                                <td className="py-3 capitalize text-slate-500">{p.payment_type.replace('_', ' ')}</td>
                                <td className="py-3 font-mono text-[10px] text-slate-400">{p.tx_ref}</td>
                                <td className="py-3">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                        p.status === 'successful' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {p.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {displayPayments.length === 0 && <p className="text-center py-4 text-slate-500 italic">No payments recorded yet.</p>}
            </div>
        </div>

        {/* Pharmacy Orders */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Recent Pharmacy Orders</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b text-[10px] uppercase text-slate-400 font-bold"><th className="pb-2">Patient</th><th className="pb-2">Items</th><th className="pb-2">Total</th><th className="pb-2">Delivery</th><th className="pb-2">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {pharmacyOrders.map(o => (
                            <tr key={o.id}>
                                <td className="py-3 font-bold text-slate-700">{o.profiles?.full_name}</td>
                                <td className="py-3 text-slate-600 text-xs">
                                    {o.items?.map((i: any) => `${i.medication?.name} (x${i.quantity})`).join(', ')}
                                </td>
                                <td className="py-3 font-bold text-emerald-600">₦{Number(o.total_amount).toLocaleString()}</td>
                                <td className="py-3 text-slate-500 text-xs">{o.delivery_method} {o.pickup_location ? `(${o.pickup_location})` : ''}</td>
                                <td className="py-3"><span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase">{o.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {pharmacyOrders.length === 0 && <p className="text-center py-4 text-slate-500">No pharmacy orders found.</p>}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hospitals */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-xl font-bold text-slate-800">Hospitals</h3>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{hospitals.length}</span>
          </div>
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
            {hospitals.map(h => (
                <div key={h.id} className="text-sm border-b border-slate-50 pb-2 flex justify-between items-center group">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{h.name}</span>
                        <span className="text-slate-500 text-xs">{h.location}</span>
                    </div>
                    <button onClick={() => handleDelete('hospitals', h.id, fetchHospitals)} className="text-red-500 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            ))}
          </div>
          <button onClick={() => setShowHospitalModal(true)} className="bg-sky-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-sky-700 w-full transition-colors">+ Add New Hospital</button>
        </div>

        {/* Pharmacies */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-xl font-bold text-slate-800">Pharmacies</h3>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{pharmacies.length}</span>
          </div>
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
            {pharmacies.map(p => (
                <div key={p.id} className="text-sm border-b border-slate-50 pb-2 flex justify-between items-center group">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{p.name}</span>
                        <span className="text-slate-500 text-xs">{p.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedPharmacyId(p.id); setShowMedicationModal(true); }} className="text-[10px] bg-teal-100 text-teal-700 px-2 py-1 rounded font-black uppercase hover:bg-teal-200">+ Med</button>
                        <button onClick={() => handleDelete('pharmacies', p.id, fetchPharmacies)} className="text-red-500 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            ))}
          </div>
          <button onClick={() => setShowPharmacyModal(true)} className="bg-sky-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-sky-700 w-full transition-colors">+ Add New Pharmacy</button>
        </div>

        {/* Labs */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-xl font-bold text-slate-800">Laboratories</h3>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{labs.length}</span>
          </div>
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-2">
            {labs.map(l => (
                <div key={l.id} className="text-sm border-b border-slate-50 pb-2 flex justify-between items-center group">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{l.name}</span>
                        <span className="text-slate-500 text-xs">{l.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedLabId(l.id); setShowLabTestModal(true); }} className="text-[10px] bg-sky-100 text-sky-700 px-2 py-1 rounded font-black uppercase hover:bg-sky-200">+ Test</button>
                        <button onClick={() => handleDelete('labs', l.id, fetchLabs)} className="text-red-500 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            ))}
          </div>
          <button onClick={() => setShowLabModal(true)} className="bg-sky-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-sky-700 w-full transition-colors">+ Add New Laboratory</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medication Inventory */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Drug Inventory</h3>
            <div className="overflow-y-auto max-h-80">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b text-[10px] uppercase text-slate-400 font-bold"><th className="pb-2">Name</th><th className="pb-2">Pharmacy</th><th className="pb-2 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {medications.map(m => (
                            <tr key={m.id} className="group">
                                <td className="py-2 font-bold text-slate-700">{m.name}<p className="text-[10px] font-normal text-emerald-600">₦{m.price.toLocaleString()}</p></td>
                                <td className="py-2 text-slate-500 text-xs">{m.pharmacies?.name || 'N/A'}</td>
                                <td className="py-2 text-right">
                                    <button onClick={() => handleDelete('medications', m.id, fetchMedications)} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Lab Tests Inventory */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Lab Test Directory</h3>
            <div className="overflow-y-auto max-h-80">
                <table className="w-full text-left text-sm">
                    <thead><tr className="border-b text-[10px] uppercase text-slate-400 font-bold"><th className="pb-2">Test Name</th><th className="pb-2">Lab</th><th className="pb-2 text-right">Action</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {labTests.map(t => (
                            <tr key={t.id} className="group">
                                <td className="py-2 font-bold text-slate-700">{t.name}<p className="text-[10px] font-normal text-sky-600">₦{t.price.toLocaleString()}</p></td>
                                <td className="py-2 text-slate-500 text-xs">{t.labs?.name || 'N/A'}</td>
                                <td className="py-2 text-right">
                                    <button onClick={() => handleDelete('lab_tests', t.id, fetchLabTests)} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {showHospitalModal && (
        <EntityModal title="Add Hospital" onClose={() => setShowHospitalModal(false)} fields={[{ name: 'name', label: 'Hospital Name' }, { name: 'location', label: 'Location' }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email' }]} onSave={async (val) => {
            const { error } = await supabase.from('hospitals').insert([val]);
            if (!error) { addNotification('Success', 'Hospital added', 'success'); fetchHospitals(); setShowHospitalModal(false); }
        }}/>
      )}
      {showPharmacyModal && (
        <EntityModal title="Add Pharmacy" onClose={() => setShowPharmacyModal(false)} fields={[{ name: 'name', label: 'Pharmacy Name' }, { name: 'location', label: 'Location' }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email' }]} onSave={async (val) => {
            const { error } = await supabase.from('pharmacies').insert([val]);
            if (!error) { addNotification('Success', 'Pharmacy added', 'success'); fetchPharmacies(); setShowPharmacyModal(false); }
        }}/>
      )}
      {showLabModal && (
        <EntityModal title="Add Laboratory" onClose={() => setShowLabModal(false)} fields={[{ name: 'name', label: 'Lab Name' }, { name: 'location', label: 'Location' }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email' }]} onSave={async (val) => {
            const { error } = await supabase.from('labs').insert([val]);
            if (!error) { addNotification('Success', 'Lab added', 'success'); fetchLabs(); setShowLabModal(false); }
        }}/>
      )}
      {showMedicationModal && (
        <EntityModal title="Add Medication" onClose={() => setShowMedicationModal(false)} fields={[{ name: 'name', label: 'Drug Name' }, { name: 'description', label: 'Description' }, { name: 'price', label: 'Price (₦)', type: 'number' }, { name: 'stock_quantity', label: 'Stock', type: 'number' }]} onSave={async (val) => {
            const { error } = await supabase.from('medications').insert([{ ...val, pharmacy_id: selectedPharmacyId, price: parseFloat(val.price), stock_quantity: parseInt(val.stock_quantity) || 0 }]);
            if (!error) { addNotification('Success', 'Medication added', 'success'); fetchMedications(); setShowMedicationModal(false); }
        }}/>
      )}
      {showLabTestModal && (
        <EntityModal title="Add Lab Test" onClose={() => setShowLabTestModal(false)} fields={[{ name: 'name', label: 'Test Name' }, { name: 'description', label: 'Description' }, { name: 'price', label: 'Price (₦)', type: 'number' }, { name: 'category', label: 'Category' }, { name: 'requires_fasting', label: 'Requires Fasting?', type: 'select', options: [{ value: true, label: 'Yes' }, { value: false, label: 'No' }] }]} onSave={async (val) => {
            const { error } = await supabase.from('lab_tests').insert([{ ...val, lab_id: selectedLabId, price: parseFloat(val.price), requires_fasting: val.requires_fasting === 'true' }]);
            if (!error) { addNotification('Success', 'Lab test added', 'success'); fetchLabTests(); setShowLabTestModal(false); }
        }}/>
      )}

      {showResultModal && selectedApptForResult && (
          <EntityModal 
            title={`Upload Result for ${selectedApptForResult.profiles?.full_name}`} 
            onClose={() => { setShowResultModal(false); setSelectedApptForResult(null); }} 
            isUploading={isUploading}
            fields={[
                { name: 'test_name', label: 'Test Name' }, 
                { name: 'result_text', label: 'Result Summary/Analysis' }, 
                { name: 'file', label: 'Upload Lab Report (Image)', type: 'file' }
            ]} 
            onSave={async (val) => {
                setIsUploading(true);
                try {
                    let fileUrl = '';
                    if (val.imageFile) {
                        const file = val.imageFile;
                        const fileExt = file.name.split('.').pop();
                        const fileName = `res-${Date.now()}.${fileExt}`;
                        
                        // Ensure bucket exists and is handled gracefully
                        const { error: uploadError } = await supabase.storage
                            .from('lab-reports')
                            .upload(fileName, file, {
                                cacheControl: '3600',
                                upsert: false
                            });
                        
                        if (uploadError) {
                            console.error('Upload Error:', uploadError);
                            throw new Error(`Upload failed: ${uploadError.message}. Make sure 'lab-reports' bucket exists and is public.`);
                        }
                        
                        const { data: publicUrlData } = supabase.storage.from('lab-reports').getPublicUrl(fileName);
                        fileUrl = publicUrlData.publicUrl;
                    }

                    const { error } = await supabase.from('lab_results').insert([{ 
                        test_name: val.test_name,
                        result_text: val.result_text,
                        file_url: fileUrl,
                        appointment_id: selectedApptForResult.id,
                        patient_id: selectedApptForResult.patient_id,
                        lab_id: (selectedApptForResult as any).lab_id || null,
                        status: 'Final'
                    }]);
                    if (error) throw error;
                    
                    addNotification('Success', 'Lab result published', 'success'); 
                    fetchLabResults(); 
                    setShowResultModal(false); 
                    setSelectedApptForResult(null);
                } catch (err: any) {
                    addNotification('Error', err.message, 'error');
                } finally {
                    setIsUploading(false);
                }
            }}
          />
      )}

      {showManualResultModal && (
          <EntityModal 
            title="Manual Lab Result Upload" 
            onClose={() => setShowManualResultModal(false)} 
            isUploading={isUploading}
            fields={[
                { 
                    name: 'patient_id', 
                    label: 'Select Patient', 
                    type: 'select', 
                    options: allProfiles.map(p => ({ value: p.id, label: `${p.full_name} (${p.email})` }))
                },
                { 
                    name: 'lab_id', 
                    label: 'Select Laboratory', 
                    type: 'select', 
                    options: labs.map(l => ({ value: l.id, label: l.name }))
                },
                { name: 'test_name', label: 'Test Name' }, 
                { name: 'result_text', label: 'Result Summary/Analysis' }, 
                { name: 'file', label: 'Upload Lab Report (Image)', type: 'file' }
            ]} 
            onSave={async (val) => {
                setIsUploading(true);
                try {
                    let fileUrl = '';
                    if (val.imageFile) {
                        const file = val.imageFile;
                        const fileExt = file.name.split('.').pop();
                        const fileName = `manual-${Date.now()}.${fileExt}`;
                        
                        const { error: uploadError } = await supabase.storage
                            .from('lab-reports')
                            .upload(fileName, file, {
                                cacheControl: '3600',
                                upsert: false
                            });

                        if (uploadError) {
                            console.error('Manual Upload Error:', uploadError);
                            throw new Error(`Upload failed: ${uploadError.message}. Make sure 'lab-reports' bucket exists and is public.`);
                        }
                        
                        const { data: publicUrlData } = supabase.storage.from('lab-reports').getPublicUrl(fileName);
                        fileUrl = publicUrlData.publicUrl;
                    }

                    const { error } = await supabase.from('lab_results').insert([{ 
                        patient_id: val.patient_id,
                        lab_id: val.lab_id,
                        test_name: val.test_name,
                        result_text: val.result_text,
                        file_url: fileUrl,
                        status: 'Final'
                    }]);
                    if (error) throw error;

                    addNotification('Success', 'Manual lab result published', 'success'); 
                    fetchLabResults(); 
                    setShowManualResultModal(false); 
                } catch (err: any) {
                    addNotification('Error', err.message, 'error');
                } finally {
                    setIsUploading(false);
                }
            }}
          />
      )}

      {showBlogModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={() => { setShowBlogModal(false); setEditingBlog(null); }}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-slate-800">{editingBlog ? 'Edit Health Topic' : 'Publish New Health Topic'}</h3>
                    <button onClick={() => { setShowBlogModal(false); setEditingBlog(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
                  </div>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handlePublishBlog({
                          title: formData.get('title'),
                          category: formData.get('category'),
                          author_name: formData.get('author_name'),
                          content: formData.get('content'),
                          imageFile: (e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement).files?.[0]
                      });
                  }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Title</label>
                            <input name="title" defaultValue={editingBlog?.title} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Enter post title" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Category</label>
                            <select name="category" defaultValue={editingBlog?.category || 'Wellness'} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none">
                                <option value="Wellness">Wellness</option>
                                <option value="Nutrition">Nutrition</option>
                                <option value="Medical News">Medical News</option>
                                <option value="Mental Health">Mental Health</option>
                                <option value="Fitness">Fitness</option>
                            </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Author Name</label>
                        <input name="author_name" defaultValue={editingBlog?.author_name} required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Dr. GIVE Health Team" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Cover Image {editingBlog && '(Optional - Leave empty to keep current)'}</label>
                        <input type="file" accept="image/*" required={!editingBlog} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200" />
                        {editingBlog?.image_url && <p className="text-[10px] text-slate-400 mt-1 truncate">Current: {editingBlog.image_url}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Content (Markdown supported)</label>
                        <textarea name="content" defaultValue={editingBlog?.content} required rows={10} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm" placeholder="Write your blog content here..." />
                      </div>
                      <div className="flex gap-4 pt-4">
                          <button type="button" onClick={() => { setShowBlogModal(false); setEditingBlog(null); }} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Discard</button>
                          <button type="submit" disabled={isUploading} className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:bg-slate-400 flex items-center justify-center gap-2">
                              {isUploading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Processing...</> : (editingBlog ? 'Update Post' : 'Publish Post')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminDashboard;
