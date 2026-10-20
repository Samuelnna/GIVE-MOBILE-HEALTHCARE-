import PolicyPage from '../../components/PolicyPage';

export const metadata = { title: 'Delete account | MobileDoc' };
const body = 'Please delete my MobileDoc account and associated personal data.\n\nRegistered email or phone number: \n\nPlease confirm receipt and explain any records that must be retained, the reason, and the retention period.';

export default function DeleteAccount() {
  return <PolicyPage title="Delete your MobileDoc account">
    <p>You can request deletion of your MobileDoc account and associated personal data without installing the app or signing in. Deletion is handled by our support team after identity verification.</p>
    <section><h2>Send a deletion request</h2><ol className="list-decimal pl-6 space-y-2"><li>Email <a href="mailto:mobilehealthadmin@gmail.com">mobilehealthadmin@gmail.com</a> with the subject “MobileDoc account deletion”.</li><li>Send from your registered email where possible and include your registered email address or phone number so we can locate the account. Do not send your password, payment card details or medical documents.</li><li>Our team will verify ownership, explain any records that must be retained and confirm when deletion is completed.</li></ol>
      <a className="inline-block mt-5 rounded-lg bg-red-700 px-5 py-3 !text-white !no-underline font-semibold" href={`mailto:mobilehealthadmin@gmail.com?subject=${encodeURIComponent('MobileDoc account deletion')}&body=${encodeURIComponent(body)}`}>Open deletion request email</a>
      <p className="mt-3 text-sm">This button opens your email app. Your request is sent only after you send the email. If no email app opens, copy the address above into your email service. If you cannot access your registered email, call <a href="tel:+2349015581259">09015581259</a> for help verifying ownership.</p>
    </section>
    <section><h2>What deletion covers</h2><p>Request deletion of your sign-in account, profile and associated personal information, uploaded files and service data that we are not required to retain. After deletion you lose access to the account and its history. You can ask support about obtaining a copy of your records before deletion.</p></section>
    <section><h2>Records that may need to be retained</h2><p>Clinical records, prescriptions, payments and records needed for legal obligations, security or unresolved disputes may need to be retained. Support will explain the categories, reason and applicable retention period before completing your request. Healthcare providers and payment processors may hold independent records under their own obligations. See our <a href="/privacy-policy">privacy policy</a>.</p></section>
  </PolicyPage>;
}
