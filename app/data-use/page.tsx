import PolicyPage from '../../components/PolicyPage';

export const metadata = { title: 'Data use | MobileDoc' };
const rows = [
  ['Account and profile', 'Name, contact details, photo and sign-in information', 'Account access, identification and support'],
  ['Health and care', 'Symptoms, vitals, records, reports, prescriptions and referrals', 'Care delivery, records and selected AI features'],
  ['Communications', 'Messages, consultation details, call media and display name', 'Communication with your care providers through messaging and Jitsi'],
  ['Orders and payments', 'Bookings, orders, payment references and status; provider bank details', 'Fulfilment, Flutterwave payments, settlements and accounting'],
  ['Files you choose', 'Profile photos, prescriptions, lab reports and professional credentials', 'The upload or verification feature you select'],
];
export default function DataUse() {
  return <PolicyPage title="How MobileDoc uses data">
    <p>This overview describes the current service. The <a href="/privacy-policy">privacy policy</a> explains recipients, retention and your choices.</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="text-left mb-3 font-bold">Information and purposes</caption><thead><tr>{['Category', 'Information', 'Purpose'].map(x => <th key={x} scope="col" className="p-3 border-b">{x}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row[0]}>{row.map(cell => <td key={cell} className="p-3 border-b align-top">{cell}</td>)}</tr>)}</tbody></table></div>
    <section><h2>Optional features</h2><p>Using AI features sends the information you submit and relevant context to Google Gemini. Joining a call uses the conferencing provider and your microphone or camera permission. Only upload or submit information you want processed for that feature.</p></section>
    <section><h2>Medical information</h2><p>AI responses and educational content can be inaccurate and do not replace advice from a qualified healthcare professional. Seek professional advice before making medical decisions. MobileDoc’s AI features are not a medical device and do not diagnose, treat, cure or prevent any medical condition. For an emergency, seek urgent local medical help.</p></section>
    <section><h2>Control your information</h2><p>Update your details in Profile, manage permissions in your device settings, or <a href="/delete-account">request account and data deletion</a>. Email <a href="mailto:mobilehealthadmin@gmail.com">mobilehealthadmin@gmail.com</a> for access or correction requests.</p></section>
  </PolicyPage>;
}
