import {z} from "zod";

// Stable, optional identity: older restaurant JSON does not acquire a new design.
export const menuIdentityId=z.enum([
 "forno-classico","noite-premium","essencial","familia","atelier","urbano",
 "trattoria","festival","forno-brasa","napoli-rua","fatia-pop","pizza-vinho",
]);
export type MenuIdentityId=z.infer<typeof menuIdentityId>;
export function menuIdentityClass(identity?:MenuIdentityId){return identity?` identity-${identity}`:"";}
