// Creates a server-only local encryption key without printing it.
const fs=require('node:fs'),{randomBytes}=require('node:crypto');
const file='.env.local',content=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
if(/^\s*WHATSAPP_REMINDER_ENCRYPTION_KEY\s*=/m.test(content)) console.log('Reminder encryption key already present; left unchanged.');
else { fs.appendFileSync(file,`\nWHATSAPP_REMINDER_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}\n`); console.log('Created WHATSAPP_REMINDER_ENCRYPTION_KEY in .env.local. Copy it privately into Netlify; do not regenerate it after saving reminders.'); }
