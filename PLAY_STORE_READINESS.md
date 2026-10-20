# MobileDoc Android release preparation

Public routes added: `/privacy-policy`, `/data-use`, `/delete-account`. Profile and the shared footer link to all three. Deploy the web app to make these usable as HTTPS Play Console URLs. No Expo app has been created in this change.

## Before publishing these policies

- Confirm mobilehealthadmin@gmail.com is monitored and the published phone number works. The deletion flow is an email request, not automatic account deletion. Assign a support owner and response target before launch.
- The operator must establish the actual retention periods for clinical, prescription, payment, security and backup records. Update the policy and deletion page with the approved periods and exceptions; the current copy does not invent legal retention periods.
- Confirm the intended minimum age, guardian process, actual infrastructure locations and vendor agreements. Review disclosures against the final Expo build and every SDK it includes.

## Handling deletion requests

Verify ownership through the registered address or a secure recovery process; never ask for passwords. Record the request securely and explain the expected completion date. Inventory the user's account, database rows, storage files, messages, call metadata and vendor records before acting. Export requested records through an appropriate secure channel. Resolve any retention obligations, restrict retained records appropriately and communicate their categories, reasons and expiry dates. Delete eligible records and storage files, then remove the Supabase Auth account with server-side administration and revoke access. Confirm completion to the requester. Do not assume deleting a profile or Auth row removes every storage object or third-party record. An automated deletion backend is not part of this change.

## Play Console and Expo release checklist

- Submit the Data safety form based on the shipped app and SDK behaviour. The `/data-use` page does not replace this form. Assess each data category, collection, sharing definitions, purpose, optionality, encryption and deletion.
- Complete Health apps declaration, content rating, target audience, ads declaration and app access instructions. Provide review credentials and a way to review gated consultation features.
- Review medical claims, AI consent and prominent disclosures at the point sensitive data is sent. Include appropriate medical disclaimer in the app and store description. Verify the service's regulatory status before making medical-device claims.
- Link the public privacy policy and account deletion URL in Play Console. Carry Profile privacy/deletion links into the Expo app.
- Request only permissions needed for features, with just-in-time explanations. Verify camera, microphone, file selection and notifications in the final Android build.
- Complete developer identity/organisation verification; prepare store assets, contact information, package identifier, signing and an Android App Bundle meeting the target API requirement in force at submission.
- If applicable to the developer account, complete Google's required closed testing and apply for production access.

Official references checked 20 October 2026:

- https://support.google.com/googleplay/android-developer/answer/13327111
- https://support.google.com/googleplay/android-developer/answer/10144311
- https://support.google.com/googleplay/android-developer/answer/10787469
- https://support.google.com/googleplay/android-developer/answer/16679511
- https://support.google.com/googleplay/android-developer/answer/14738291
- https://support.google.com/googleplay/android-developer/answer/9859455
- https://support.google.com/googleplay/android-developer/answer/14151465
