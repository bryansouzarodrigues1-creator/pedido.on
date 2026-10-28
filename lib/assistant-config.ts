import {z} from "zod";
export const assistantSettings=z.object({
 enabled:z.boolean().default(false),
 name:z.string().trim().min(2).max(50).default("Assistente da pizzaria"),
 greeting:z.string().trim().min(5).max(240).default("Olá! Posso ajudar a escolher sua pizza e explicar como pedir. O que você gostaria de saber?"),
 tone:z.enum(["friendly","direct"]).default("friendly"),
 faqs:z.array(z.object({question:z.string().trim().min(4).max(160),answer:z.string().trim().min(5).max(500)}).strict()).max(12).default([]),
}).strict();
export type AssistantSettings=z.infer<typeof assistantSettings>;
