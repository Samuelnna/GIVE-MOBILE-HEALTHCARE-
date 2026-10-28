export default function PaymentReturn() {
  return <main style={{ fontFamily: 'system-ui', maxWidth: 520, margin: '80px auto', padding: 24, lineHeight: 1.7 }}><h1>Return to MobileDoc</h1><p>Your payment attempt has finished. Close this browser window and return to the MobileDoc app, then tap <strong>Confirm payment</strong>.</p><p>The app verifies your payment securely before confirming your booking or order. If confirmation is delayed, retry confirmation without paying again.</p><a href="mobiledoc://payment-return">Return to the app</a></main>;
}
