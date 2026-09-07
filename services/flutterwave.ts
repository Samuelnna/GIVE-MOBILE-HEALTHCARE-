 
const FLW_SECRET_KEY = process.env.NEXT_PUBLIC_FLUTTERWAVE_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;

export const flwService = {
    /**
     * Create a Flutterwave Subaccount programmatically
     * @param details Bank and business details
     */
    createSubaccount: async (details: {
        account_bank: string;
        account_number: string;
        business_name: string;
        business_email: string;
        business_mobile: string;
        split_value: number; // e.g., 0.2 for 20% commission to main account
    }) => {
        try {
            console.log('Flutterwave: Creating subaccount for:', details.business_name);
            
            const response = await fetch('https://api.flutterwave.com/v3/subaccounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${FLW_SECRET_KEY}`
                },
                body: JSON.stringify({
                    account_bank: details.account_bank,
                    account_number: details.account_number,
                    business_name: details.business_name,
                    business_email: details.business_email,
                    business_mobile: details.business_mobile,
                    business_contact: details.business_name,
                    business_contact_mobile: details.business_mobile,
                    split_type: "percentage",
                    split_value: details.split_value
                })
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                console.log('Flutterwave: Subaccount created successfully:', data.data.subaccount_id);
                return { success: true, subaccount_id: data.data.subaccount_id };
            } else {
                console.error('Flutterwave: Creation failed:', data.message);
                return { success: false, message: data.message };
            }
        } catch (error: any) {
            console.error('Flutterwave: API Error:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Common Nigerian Banks and their codes for Flutterwave
     */
    getBanks: () => [
        { code: "044", name: "Access Bank" },
        { code: "011", name: "First Bank of Nigeria" },
        { code: "058", name: "Guaranty Trust Bank" },
        { code: "057", name: "Zenith Bank" },
        { code: "033", name: "United Bank For Africa" },
        { code: "030", name: "Heritage Bank" },
        { code: "032", name: "Union Bank of Nigeria" },
        { code: "035", name: "Wema Bank" },
        { code: "050", name: "Ecobank Nigeria" },
        { code: "070", name: "Fidelity Bank" },
        { code: "082", name: "Keystone Bank" },
        { code: "232", name: "Sterling Bank" },
        { code: "215", name: "Unity Bank" },
        { code: "999992", name: "OPay Digital Services Limited (OPay)" },
        { code: "100004", name: "Palmpay" },
        { code: "090267", name: "Kuda Bank" }
    ]
};
