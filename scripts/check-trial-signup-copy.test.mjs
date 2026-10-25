import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TRIAL_DAYS} from "../lib/trial-policy.ts";

test("signup and homepage share the same free-trial duration",()=>{
  const auth=readFileSync(new URL("../components/auth-form.tsx",import.meta.url),"utf8");
  const home=readFileSync(new URL("../components/idea-start.tsx",import.meta.url),"utf8");
  const plans=readFileSync(new URL("../components/plan-cards.tsx",import.meta.url),"utf8");
  assert.equal(TRIAL_DAYS,10);
  assert.match(auth,/register:\{tag:`\$\{TRIAL_DAYS\} DIAS GRÁTIS`/);
  assert.match(home,/\{TRIAL_DAYS\} dias grátis/);
  assert.match(plans,/\$\{TRIAL_DAYS\} dias grátis/);
  assert.doesNotMatch(auth,/1 MÊS GRÁTIS|30 DIAS/);
});
