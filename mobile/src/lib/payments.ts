export const CONSULTATION_FEE = 1000;
export const HOSPITAL_SERVICE_FEE = 1000;

export const DEFAULT_SHARES = {
  lab: 0.8,
  doctor: 0.7,
  hospital: 0.85,
  pharmacy: 0.9,
};

export function buildFlutterwaveHtml(opts: {
  publicKey: string;
  amount: number;
  email: string;
  name: string;
  txRef: string;
  title?: string;
  description?: string;
  subaccountId?: string;
  ratio?: number;
}) {
  const subaccounts = opts.subaccountId
    ? JSON.stringify([
        {
          id: opts.subaccountId,
          transaction_split_ratio: opts.ratio ?? 0.7,
        },
      ])
    : 'undefined';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://checkout.flutterwave.com/v3.js"></script>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #064E3B; color: white; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
      .wrap { text-align: center; padding: 32px; }
      button { background: #059669; color: white; border: 0; padding: 16px 28px; border-radius: 16px; font-weight: 800; font-size: 16px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h2>MobileDoc Checkout</h2>
      <p>Secure payment via Flutterwave</p>
      <button onclick="pay()">Pay now</button>
    </div>
    <script>
      function send(payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      }
      function pay() {
        FlutterwaveCheckout({
          public_key: ${JSON.stringify(opts.publicKey)},
          tx_ref: ${JSON.stringify(opts.txRef)},
          amount: ${Number(opts.amount)},
          currency: "NGN",
          payment_options: "card, banktransfer, ussd",
          customer: {
            email: ${JSON.stringify(opts.email)},
            name: ${JSON.stringify(opts.name)},
          },
          customizations: {
            title: ${JSON.stringify(opts.title || 'MobileDoc Healthcare')},
            description: ${JSON.stringify(opts.description || 'Payment for medical services')},
            logo: ${JSON.stringify((process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '') + '/mobiledoclogo.jpeg')}
          },
          subaccounts: ${subaccounts},
          callback: function (data) {
            send({ type: 'success', data: data });
          },
          onclose: function () {
            send({ type: 'close' });
          }
        });
      }
      window.addEventListener('load', pay);
    </script>
  </body>
</html>`;
}

export function makeTxRef() {
  return `MDOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
