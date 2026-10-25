import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const admin=readFileSync(new URL("../app/configuracao/page.tsx",import.meta.url),"utf8");
const account=readFileSync(new URL("../components/account-settings.tsx",import.meta.url),"utf8");
const route=readFileSync(new URL("../app/api/auth/[action]/route.ts",import.meta.url),"utf8");
test("admin interface has no user-password viewer or direct provider-users shortcut",()=>{
 assert.match(admin,/não visualiza senhas antigas/i);
 assert.doesNotMatch(admin,/auth\/users/);
 assert.doesNotMatch(admin,/temporaryPassword/);
});
test("account settings never skip current password just because browser is signed in",()=>{
 assert.match(account,/currentPassword:current/);
 assert.match(account,/Solicitar ajuda para recuperar o acesso/);
 assert.match(route,/changePassword\(data\.password,data\.currentPassword\)/);
});
