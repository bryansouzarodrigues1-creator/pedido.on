export const MIN_PASSWORD_LENGTH = 6;
export const ADMIN_PASSWORD_MIN_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export function validPassword(value:string,minimum=MIN_PASSWORD_LENGTH){
 return value.length>=minimum&&value.length<=MAX_PASSWORD_LENGTH&&!/\x00/.test(value);
}
export function passwordMessage(value:string,minimum=MIN_PASSWORD_LENGTH){
 if(!value)return "Informe sua senha.";
 if(value.length<minimum)return `Use pelo menos ${minimum} caracteres na senha.`;
 if(value.length>MAX_PASSWORD_LENGTH)return `Use até ${MAX_PASSWORD_LENGTH} caracteres na senha.`;
 if(/\x00/.test(value))return "A senha contém um caractere inválido.";
 return "";
}
export function setPasswordValidity(input:HTMLInputElement,minimum=MIN_PASSWORD_LENGTH){
 input.setCustomValidity(passwordMessage(input.value,minimum));
}
