import {safeReturnPath} from "./auth-policy";
export function chatGPTSignInPath(returnTo="/app"){return "/signin-with-chatgpt?return_to="+encodeURIComponent(safeReturnPath(returnTo));}
export function chatGPTSignOutPath(returnTo="/"){return "/signout-with-chatgpt?return_to="+encodeURIComponent(safeReturnPath(returnTo,"/"));}

