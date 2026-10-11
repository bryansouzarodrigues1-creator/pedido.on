import {z} from "zod";
export const chatInput=z.object({text:z.string().trim().min(1).max(1000)}).strict();
export const CHAT_LIMIT=100;
export const CHAT_POLL_MS=6000;
export function chatClosed(status:string){return status==="delivered"||status==="canceled";}
export function chatMessage(text:string){return chatInput.parse({text}).text;}
