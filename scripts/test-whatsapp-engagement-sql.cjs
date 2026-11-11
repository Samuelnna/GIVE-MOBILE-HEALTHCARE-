const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {PGlite}=require(process.env.PGLITE_TEST_PATH||path.resolve('.codex/whatsapp-sql-check-local/node_modules/@electric-sql/pglite'));
(async()=>{
  const db=new PGlite();
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;');
  await db.exec(fs.readFileSync('whatsapp_triage_memory.sql','utf8'));
  const migration=fs.readFileSync('whatsapp_engagement_reminders.sql','utf8');await db.exec(migration);await db.exec(migration);
  const session='a'.repeat(64),other='b'.repeat(64),lease='00000000-0000-4000-8000-000000000001',reminder='00000000-0000-4000-8000-000000000002';
  const call=async(op,id,changes={},key=session,clear=true)=>{
    const r=await db.query('SELECT whatsapp_engagement_turn($1,$2,$3,$4,$5,$6,$7,$8) AS result',[op,key,id,lease,'[navigation]',op==='prepare'?'Reply':null,clear,changes]);return r.rows[0].result;
  };
  for(const role of ['anon','authenticated']){
    await db.exec('SET ROLE '+role);await assert.rejects(()=>call('claim','denied'),/permission denied/);
    await assert.rejects(()=>db.query('SELECT whatsapp_traction_summary()'),/permission denied/);
    await assert.rejects(()=>db.query('SELECT * FROM whatsapp_medication_reminders'),/permission denied/);await db.exec('RESET ROLE');
  }
  await db.exec('SET ROLE service_role');
  assert.equal((await call('claim','first')).consented,null);
  await call('prepare','first');await call('finish','first');
  let stats=(await db.query('SELECT whatsapp_traction_summary() AS report')).rows[0].report;
  assert.equal(stats.contacts,1);assert.equal(stats.users,0);assert.equal(stats.inboundMessages,1);
  await call('claim','accept');await call('prepare','accept',{consent:'accept'});await call('finish','accept');
  let state=await call('claim','ai');assert.equal(state.consented,true);assert.equal(state.ai_turns,0);
  await call('prepare','ai',{ai_used:true,handoff:true},session,false);await call('release','ai');
  state=await call('claim','ai');assert.equal(state.ai_turns,1);assert.equal(state.reply,'Reply');
  await call('prepare','ai',{ai_used:true,handoff:true},session,false);await call('finish','ai');
  stats=(await db.query('SELECT whatsapp_traction_summary() AS report')).rows[0].report;
  assert.equal(stats.users,1);assert.equal(stats.messages,1);assert.equal(stats.aiReplies,1);assert.equal(stats.consents,1);assert.equal(stats.websiteHandoffs,1);
  assert.equal(JSON.stringify(stats).includes(session),false);assert.equal(JSON.stringify(stats).includes('Reply'),false);
  await call('claim','create');
  await call('prepare','create',{create_reminder:{id:reminder,payload:'encrypted',times:[480,1200],next_due:new Date(Date.now()+60000).toISOString(),ends_at:new Date(Date.now()+86400000).toISOString()}});await call('finish','create');
  await db.query("UPDATE whatsapp_medication_reminders SET next_due=now()-interval '1 minute' WHERE id=$1",[reminder]);
  let jobs=(await db.query('SELECT * FROM whatsapp_claim_reminders(5)')).rows;assert.equal(jobs.length,1);
  assert.equal((await db.query('SELECT * FROM whatsapp_claim_reminders(5)')).rows.length,0);
  await db.query("SELECT whatsapp_finish_reminder($1,$2,'sent',$3)",[reminder,jobs[0].lease,new Date(Date.now()+3600000).toISOString()]);
  stats=(await db.query('SELECT whatsapp_traction_summary() AS report')).rows[0].report;assert.equal(stats.remindersCreated,1);assert.equal(stats.remindersSent,1);
  await call('claim','stop');await call('prepare','stop',{stop_reminders:true});await call('finish','stop');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM whatsapp_medication_reminders')).rows[0].n,0);
  await call('claim','revoke');await call('prepare','revoke',{consent:'revoke'});await call('finish','revoke');assert.equal((await call('claim','again')).consented,null);await call('release','again');
  await call('claim','other',{},other);await call('prepare','other',{consent:'accept'},other);await call('finish','other',{},other);
  for(let i=0;i<4;i++){let id='budget'+i;await call('claim',id,{},other);await call('prepare',id,{ai_used:true},other);await call('finish',id,{},other);}
  await call('claim','over',{},other);await assert.rejects(()=>call('prepare','over',{ai_used:true},other),/turn limit/);await call('release','over',{},other);
  // Active days and period selection are evaluated in WAT, not host local time.
  await db.query("UPDATE whatsapp_usage_events SET created_at=now()-interval '2 days' WHERE id='budget0:usage'");
  stats=(await db.query('SELECT whatsapp_traction_summary() AS report')).rows[0].report;assert.equal(stats.repeatUsers,1);assert.equal(stats.daily.length,14);
  const filtered=(await db.query("SELECT whatsapp_traction_summary(now()-interval '1 day') AS report")).rows[0].report;assert.equal(filtered.repeatUsers,0);
  const oldTurn=await call('claim','inflight',{},other);
  const cancelled=await call('claim','stop-inflight',{control:'stop'},other);assert.equal(cancelled.state,'busy');
  assert.equal((await db.query('SELECT consent_version FROM whatsapp_participants WHERE conversation_key=$1',[other])).rows[0].consent_version,null);
  await assert.rejects(()=>call('prepare','inflight',{consent:'accept',epoch:oldTurn.epoch},other),/consent changed/);
  await call('release','inflight',{},other);
  assert.equal((await call('claim','inflight',{},other)).state,'sent');
  const stopState=await call('claim','stop-inflight',{control:'stop'},other);assert.equal(stopState.state,'claimed');
  await call('prepare','stop-inflight',{consent:'revoke',epoch:stopState.epoch},other);await call('finish','stop-inflight',{},other);
  await db.close();console.log('PASS: actual Postgres migration/re-run, server-only access, consent, retry-safe analytics, aggregate privacy, reminder creation/leases/sending/cancellation, revocation, AI turn budget, return-day frequency, and date filtering.');
})().catch(error=>{console.error(error);process.exit(1);});
