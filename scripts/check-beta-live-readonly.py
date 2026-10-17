#!/usr/bin/env python3
"""Anonymous GET-only checks of the actual pizzaria.on production for small beta launch.
Never creates accounts, places orders, touches Asaas, starts AI, or reads customer data.
Only a few public endpoints and authorization denials are inspected.
"""
import concurrent.futures
from datetime import datetime, timezone
import json
import sys
from urllib.parse import urlparse
import urllib.error
import urllib.request

ORIGIN = "https://forno-cardapios.waves4845.chatgpt.site"
TIMEOUT = 18
CHECKS = [
    ("/", 200, "text/html"),
    ("/criar", 200, "text/html"),
    ("/entrar", 200, "text/html"),
    ("/demo/pedidos", 200, "text/html"),
    ("/offline", 200, "text/html"),
    ("/manifest.webmanifest", 200, "application/manifest+json"),
    ("/pwa/icon-192.png", 200, "image/png"),
    ("/sw.js", 200, "text/javascript"),
    ("/api/auth/config", 200, "application/json"),
    ("/api/restaurants", 401, "application/json"),
    ("/api/admin/status", 401, "application/json"),
    ("/api/billing/status", 401, "application/json"),
]

# These are expected only after the later 12-style source is deployed on Sites.
# Record them as release gaps, not as a failure of existing orders/login.
OPTIONAL_STYLES = [
    ("/demo/forno-classico", 200, "text/html"),
    ("/demo/noite-premium", 200, "text/html"),
]

class SameOriginOnly(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        parsed = urlparse(newurl)
        if parsed.scheme != "https" or parsed.netloc != urlparse(ORIGIN).netloc:
            raise ValueError("Cross-origin redirect refused")
        return super().redirect_request(request, fp, code, msg, headers, newurl)

def check(item):
    path, expected, expected_type = item
    out = {"path": path, "pass": False}
    request = urllib.request.Request(ORIGIN + path, headers={
        "User-Agent": "pizzaria-on-beta-readonly/1.0",
        "Accept-Encoding": "identity",
    }, method="GET")
    try:
        try:
            response = urllib.request.build_opener(SameOriginOnly()).open(request, timeout=TIMEOUT)
        except urllib.error.HTTPError as e:
            response = e
        with response:
            body = response.read(1_500_001)
            ct = response.headers.get("Content-Type", "")
            cache = response.headers.get("Cache-Control", "").lower()
            status = response.status
            out["status"] = status
            if len(body) > 1_500_000:
                raise ValueError("Body exceeds inspection size")
            if status != expected:
                raise ValueError("Unexpected HTTP status")
            if not ct.startswith(expected_type):
                raise ValueError("Unexpected content type")
            if expected == 401:
                if "private" not in cache or "no-store" not in cache:
                    raise ValueError("Private endpoint cache policy missing")
                if set(json.loads(body)) != {"error"}:
                    raise ValueError("Private endpoint includes fields beyond an error")
            if path == "/api/auth/config":
                payload = json.loads(body)
                if payload.get("enabled") is not True:
                    raise ValueError("Auth disabled")
                if payload.get("registrationEnabled") is not True or payload.get("inviteRequired") is not False:
                    raise ValueError("Public registration is not open")
            if path == "/manifest.webmanifest":
                payload = json.loads(body)
                if payload.get("display") != "standalone":
                    raise ValueError("PWA manifest is not standalone")
            if path == "/criar" and b"pizzeria-idea" not in body and b"Crie seu card" not in body:
                raise ValueError("Creator not recognizable in returned HTML")
            out["pass"] = True
    except Exception as e:
        out["failure"] = type(e).__name__ + ": " + str(e)
    return out

def main():
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(check, CHECKS))
        optional = list(pool.map(check, OPTIONAL_STYLES))
    passed = sum(x["pass"] for x in results)
    report = {
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "origin": ORIGIN,
        "mode": "anonymous GET only",
        "passed": passed,
        "total": len(results),
        "checks": results,
        "additional_style_probes": optional,
        "extra_styles_published": all(x["pass"] for x in optional),
        "limitations": [
            "Later 12-style feature routes are separately tested; failures mean source is not live",
            "Does not verify logged-in flow, AI quality, real orders, Asaas payment or email delivery",
            "Does not validate OCR camera, Android installation, push, or R2 images",
            "No accounts, customer data, payments, or orders are created"
        ]
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if passed == len(results) else 1

if __name__ == "__main__":
    sys.exit(main())
