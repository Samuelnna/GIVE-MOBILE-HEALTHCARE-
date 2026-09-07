
'use server';

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;

export async function createSubaccountAction(details: {
    account_bank: string;
    account_number: string;
    business_name: string;
    business_email: string;
    business_mobile: string;
    split_value: number;
}) {
    try {
        if (!FLW_SECRET_KEY) {
            return { success: false, error: "Server configuration missing: Flutterwave Secret Key is not set." };
        }

        console.log('Server Action: Creating subaccount for:', details.business_name);
        
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
                country: "NG",
                split_type: "percentage",
                split_value: details.split_value
            })
        });

        const data = await response.json();
        
        if (data.status === 'success') {
            return { 
                success: true, 
                subaccount_id: data.data.subaccount_id 
            };
        } else {
            // Handle case where subaccount already exists
            if (data.message && data.message.includes('already exists')) {
                console.log('Server Action: Subaccount already exists, attempting to find existing...');
                
                // Fetch all subaccounts to find the one matching this business name or account number
                const listRes = await fetch('https://api.flutterwave.com/v3/subaccounts', {
                    headers: { 'Authorization': `Bearer ${FLW_SECRET_KEY}` }
                });
                const listData = await listRes.json();
                
                if (listData.status === 'success' && Array.isArray(listData.data)) {
                    const existing = listData.data.find((s: any) => 
                        s.account_number === details.account_number && s.account_bank === details.account_bank
                    );
                    
                    if (existing) {
                        console.log('Server Action: Found existing subaccount ID:', existing.subaccount_id);
                        return { success: true, subaccount_id: existing.subaccount_id, alreadyExists: true };
                    }
                }
            }

            return { 
                success: false, 
                error: data.message || "Failed to create subaccount on Flutterwave." 
            };
        }
    } catch (error: any) {
        console.error('Server Action Error:', error);
        return { 
            success: false, 
            error: error.message || "An unexpected server error occurred." 
        };
    }
}

/**
 * Verify a transaction programmatically with Flutterwave
 * This action attempts multiple lookup methods (ID and Ref) for maximum reliability
 */
export async function verifyTransactionAction(idOrRef: string) {
    try {
        if (!FLW_SECRET_KEY) {
            return { success: false, error: "Server configuration missing: Flutterwave Secret Key is not set." };
        }

        console.log('Server Action: Attempting multi-stage verification for:', idOrRef);
        
        // Stage 1: Try direct ID verification
        let response = await fetch(`https://api.flutterwave.com/v3/transactions/${idOrRef}/verify`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${FLW_SECRET_KEY}` }
        });
        let data = await response.json();

        // Stage 2: If ID fails, try Reference lookup (if the string looks like our GIVE- prefix)
        if (data.status !== 'success') {
            console.log('Server Action: ID lookup failed, trying Reference lookup...');
            response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${idOrRef}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${FLW_SECRET_KEY}` }
            });
            data = await response.json();
        }
        
        if (data.status === 'success') {
            console.log('Server Action: Verification successful!');
            return { 
                success: true, 
                data: data.data 
            };
        } else {
            console.warn('Server Action: All verification methods failed for:', idOrRef, data.message);
            return { 
                success: false, 
                error: data.message || "Transaction not found on Flutterwave using ID or Reference." 
            };
        }
    } catch (error: any) {
        console.error('Server Action Verify Error:', error);
        return { 
            success: false, 
            error: error.message || "An unexpected server error occurred." 
        };
    }
}
