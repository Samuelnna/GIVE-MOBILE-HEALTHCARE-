import {createClient} from '@supabase/supabase-js';
export default async () => {
  if(process.env.WHATSAPP_SUPPORT_ENABLED!=='true')return;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw Error('Support cleanup configuration missing');
  const {error}=await createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).rpc('whatsapp_support_cleanup');
  if(error)throw Error('Support cleanup failed');
};
export const config={schedule:'0 * * * *'};
