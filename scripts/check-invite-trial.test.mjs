import test from "node:test";
import assert from "node:assert/strict";
import {inviteConfigured,matchesInvite} from "../lib/invite-policy.ts";
import {trialFromStart,TRIAL_SECONDS} from "../lib/trial-policy.ts";
test("invite secret is required and never accepted when absent",async()=>{
 const secret="PIZZARIA-BETA-EXEMPLO-128";
 assert.equal(inviteConfigured(secret),true);
 for (const invalid of ["",undefined,"pequeno","has spaces here 2026", "a".repeat(129)]) assert.equal(inviteConfigured(invalid),false);
 assert.equal(await matchesInvite(secret,secret),true);
 assert.equal(await matchesInvite(secret.toLowerCase(),secret),false);
 assert.equal(await matchesInvite("qualquer",undefined),false);
 assert.equal(await matchesInvite("qualquer",secret),false);
 assert.equal(await matchesInvite("x".repeat(300),secret),false);
});
test("new trial runs exactly ten 24-hour days and never renews on login",()=>{
 const start = Date.parse("2026-10-11T13:00:00.000Z")/1000;
 assert.equal(TRIAL_SECONDS,864000);
 assert.deepEqual(trialFromStart(start,start),{status:"active",endsAt:start+TRIAL_SECONDS,daysRemaining:10});
 assert.equal(trialFromStart(new Date(start*1000).toISOString(),start+TRIAL_SECONDS-1).daysRemaining,1);
 assert.equal(trialFromStart(start,start+TRIAL_SECONDS).status,"expired");
 assert.equal(trialFromStart(start,start+TRIAL_SECONDS*10).status,"expired");
 assert.equal(trialFromStart(null,start).status,"not_started");
 assert.equal(trialFromStart("not-a-date",start).status,"not_started");
 assert.equal(trialFromStart(start+3600,start).status,"not_started");
});
test("recorded trial deadlines preserve the granted offer while new defaults expire at ten days",()=>{
 const start=Date.parse("2026-10-01T13:00:00.000Z")/1000,now=start+15*86400,end=start+30*86400;
 assert.equal(trialFromStart(start,now).status,"expired");
 assert.deepEqual(trialFromStart(start,now,end),{status:"active",endsAt:end,daysRemaining:15});
 assert.equal(trialFromStart(start,end,end).status,"expired");
 for(const invalid of [null,0,start-1,NaN,Infinity])assert.equal(trialFromStart(start,start,invalid).endsAt,start+TRIAL_SECONDS);
});
