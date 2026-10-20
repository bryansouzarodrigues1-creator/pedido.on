import {readMenuPages} from "./menu-reader-policy.ts";
import {inspectMenuSourceText} from "./menu-source-links.ts";
import type {Reading} from "./menu-reader-storage.ts";

/** Guest rows cannot be edited individually. Rebuild them from the retained
 * source so an older parser's wrong names do not survive an application update.
 * This is never used for the owner's editable or published restaurant. */
export function refreshGuestMenuReading(saved:Reading):Reading{
 const input=saved.pages.filter(page=>page.lines.length).map(page=>({id:page.id,lines:page.lines}));
 const text=inspectMenuSourceText(saved.text||"").menuText;
 if(text.trim())input.push({id:"text",lines:text.split("\n").map(value=>({text:value}))});
 if(!input.length)return saved;
 const result=readMenuPages(input);
 return {...saved,items:result.items,unmatched:result.unmatched};
}
