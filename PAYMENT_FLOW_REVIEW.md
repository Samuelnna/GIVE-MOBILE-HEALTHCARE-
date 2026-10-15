# Payment and booking review

## Consultation with any active professional

Doctors, pharmacists, nurses, and other professionals use the Professionals booking list and the same appointments table. A server-created pending payment is saved before checkout. Successful server verification updates it. The browser then creates a Pending appointment linked by payment_id. The selected professional loads appointments by doctor_id (the historical column name also stores other professional IDs), accepts it as Upcoming, and can open the patient chat using the new Chat button.

Professional earnings now match the payment's targeted professional or its exact appointment payment_id, rather than every payment made by a shared patient. Pharmacist/nurse consultations now save as professional_consultation. Run professional_payment_visibility.sql to allow professionals to read targeted payments without unsafe UUID casts.

Payment and appointment creation are still separate. A payment recovered via Check payment or a webhook does not automatically reconstruct an appointment. A database booking failure must be reconciled using the saved payment. Messaging currently requires successful consultation payment for gated professionals, not appointment acceptance; the Chat shortcut appears after acceptance but acceptance is not a new database authorization requirement.

## Medicine purchase

Pharmacy checkout still creates pharmacy_order payments. Consultation payment protection only applies to doctor_consultation and professional_consultation and does not block pharmacy_order. It then saves a pharmacy_orders row and medication items. Admin loads payments through the verified admin server action, and orders through its existing order query. Patient Payments loads their payments directly.

Fixed ignored order-item errors: the app no longer clears the cart or reports a complete order if item saving fails. Mixed-pharmacy baskets are blocked before charging because the current split flow supports one pharmacy per checkout. Cart cleanup failures are reported after the order saves.

Medicine payments currently use the browser callback saving path, not the consultation server verification flow. They lack browser-independent recovery. No live charge or live pharmacy RLS verification was performed.

Medicine orders are not consultation bookings. The professional dashboard currently has no medicine-order queue and no reliable pharmacy-to-professional assignment. Medicine fulfilment is managed by admin. Do not assume a medicine purchase creates a pharmacist consultation or appointment. Adding professional medicine fulfilment requires an explicit pharmacy/staff assignment and order access policies.

## Database verification still required

The SQL files are local artifacts and are not automatically applied to Supabase. Read the appointment, message, and pharmacy policies returned by professional_payment_visibility.sql to verify the live access rules. Test with test-mode gateway keys and separate patient/professional sessions: consultation success, correct professional visibility, Accept, Chat, medicine checkout, patient/admin payment visibility, order items, and cancelled checkout. Existing medicine charges should not be repeated merely to test.
