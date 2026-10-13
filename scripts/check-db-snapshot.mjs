// Checks newly reconstructed metadata against the actual pinned Drizzle generator.
// Only schema definitions are printed on failure; never opens a database or runtime secrets.
import {execFileSync} from "node:child_process";
import {readFileSync,readdirSync} from "node:fs";
execFileSync("pnpm",["db:generate"],{stdio:"inherit"});
const changed=execFileSync("git",["status","--porcelain","--","drizzle","db/schema.ts"],{encoding:"utf8"});
if(changed.trim()){
 const last=readdirSync("drizzle/meta").filter(n=>n.endsWith("_snapshot.json")).sort().at(-1);
 const snapshot=JSON.parse(readFileSync("drizzle/meta/"+last,"utf8"));
 console.log("Generated Asaas schema:",JSON.stringify(Object.fromEntries(Object.entries(snapshot.tables).filter(([name])=>name.startsWith("asaas_")))));
 console.error("Schema and metadata differ. Review generated migration:",changed);
 process.exit(1);
}
console.log("Schema metadata matches the pinned Drizzle generator.");
