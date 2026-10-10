import { getAccountUser, authConfig, assertCsrf } from "@/lib/auth";
import { platformAdmin, emailDeliveryReady, authTestMode } from "@/lib/platform";
import { aiConfig } from "@/lib/ai";
import { checkSupabase, checkOpenAi } from "@/lib/integration-checks";
import { HttpError, sameOrigin, privateHeaders, throttle, errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    assertCsrf(request);
    const user = await getAccountUser();
    if (!user) throw new HttpError(401, "Entre para continuar.");
    if (!platformAdmin(user)) throw new HttpError(403, "Esta verificação é exclusiva do proprietário da plataforma.");
    await throttle("platform-check:" + user.userId, 8, 300);
    const auth = authConfig(), ai = aiConfig();
    const results = await Promise.all([
      checkSupabase({ origin: auth.origin, key: auth.key, sessionKey: auth.seal, emailReady: emailDeliveryReady(), googleEnabled: auth.googleEnabled, prototype: authTestMode() }),
      checkOpenAi(ai),
    ]);
    return Response.json({ checkedAt: new Date().toISOString(), checks: results.flat() }, { headers: privateHeaders });
  } catch (error) { return errorResponse(error); }
}
