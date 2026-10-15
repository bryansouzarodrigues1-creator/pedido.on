#!/usr/bin/env python3
"""Opt-in production smoke check. GET only, anonymous, no provider/model/payment calls."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.request
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url', default='https://forno-cardapios.waves4845.chatgpt.site')
parser.add_argument('--output', type=Path)
args = parser.parse_args()
base = args.url.rstrip('/')
if not base.startswith('https://') or urlparse(base).path not in ['', '/']:
    parser.error('Use somente a origem HTTPS do aplicativo.')
root = Path(__file__).resolve().parent.parent
checks = [
    ('/', 200, 'text/html', None),
    ('/calculadora', 200, 'text/html', None),
    ('/assinatura?plan=essencial', 200, 'text/html', None),
    ('/assinatura?plan=profissional', 200, 'text/html', None),
    ('/assinatura?plan=rede', 200, 'text/html', None),
    ('/demo/pedidos', 200, 'text/html', None),
    ('/offline', 200, 'text/html', None),
    ('/order-print.js', 200, 'text/javascript', 'public/order-print.js'),
    ('/order-demo-print.js', 200, 'text/javascript', 'public/order-demo-print.js'),
    ('/demo/pedidos/comanda?copy=kitchen&mode=pix&status=awaiting_payment&paymentStatus=pending', 200, 'text/html', None),
    ('/demo/pedidos/comanda?copy=delivery&mode=cash&status=confirmed&paymentStatus=pay_on_delivery', 200, 'text/html', None),
    ('/sw.js', 200, 'text/javascript', 'public/sw.js'),
    ('/pwa-release.js', 200, 'text/javascript', 'public/pwa-release.js'),
    ('/manifest.webmanifest', 200, 'application/manifest+json', None),
    ('/pwa/icon-192.png', 200, 'image/png', 'public/pwa/icon-192.png'),
    ('/pwa/icon-512.png', 200, 'image/png', 'public/pwa/icon-512.png'),
    ('/api/admin/status', 401, 'application/json', None),
    ('/api/restaurants', 401, 'application/json', None),
    ('/api/billing/status', 401, 'application/json', None),
    ('/api/restaurants/shop-qa/orders/00000000-0000-4000-8000-000000000000/print?copy=kitchen', 401, 'application/json', None),
]

class SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        if not newurl.startswith(base + '/'):
            raise ValueError('Redirecionamento para outra origem recusado.')
        return super().redirect_request(request, fp, code, msg, headers, newurl)

def check(item):
    path, expected_status, expected_type, source = item
    result = {'path': path, 'ok': False}
    try:
        request = urllib.request.Request(base + path, headers={'User-Agent': 'pizzaria-on-readonly-qa/1.0', 'Accept-Encoding': 'identity'})
        opener = urllib.request.build_opener(SameOriginRedirect())
        try:
            response = opener.open(request, timeout=25)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            data = response.read(2 * 1024 * 1024 + 1)
            content_type = response.headers.get('Content-Type', '')
            cache = response.headers.get('Cache-Control', '')
            result.update(status=response.status, content_type=content_type, bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
            assert response.status == expected_status, 'Status HTTP inesperado.'
            assert content_type.startswith(expected_type), 'Content-Type inesperado.'
            assert len(data) <= 2 * 1024 * 1024, 'Resposta acima do limite do diagnóstico.'
            if expected_status == 401:
                assert 'private' in cache and 'no-store' in cache, 'Resposta privada sem proteção de cache.'
                assert set(json.loads(data)) == {'error'}, 'Acesso anônimo retornou campos inesperados.'
            if source:
                result['matches_source'] = hashlib.sha256((root / source).read_bytes()).hexdigest() == result['sha256']
                assert result['matches_source'], 'Bytes publicados diferem do arquivo local.'
            if path == '/':
                for plan in ['essencial', 'profissional', 'rede']:
                    assert ('href="/assinatura?plan=' + plan + '"').encode() in data, 'Plano sem acesso à contratação.'
            if path.startswith('/assinatura?'):
                destination = urlparse(response.geturl())
                assert destination.path == '/entrar', 'Assinatura anônima não exige login.'
                assert parse_qs(destination.query).get('next') == [path], 'Plano escolhido se perdeu no login.'
                assert b'<form' in data, 'Formulário de acesso indisponível.'
            if path == '/manifest.webmanifest':
                manifest = json.loads(data)
                assert manifest['display'] == 'standalone'
                assert manifest['start_url'].startswith('/app')
            if path == '/order-print.js':
                assert b'cache:"no-store"' in data and b'window.print()' in data
            if path.startswith('/demo/pedidos/comanda?'):
                assert 'DEMONSTRAÇÃO · SEM VALOR'.encode() in data
                assert b'data-order-demo="true"' in data and b'/order-demo-print.js' in data
                assert 'frame-ancestors'.encode() in response.headers.get('Content-Security-Policy', '').encode()
            result['ok'] = True
    except Exception as error:
        result['error'] = type(error).__name__ + ': ' + str(error)
    return result

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    results = list(pool.map(check, checks))
report = {'checked_at': datetime.now(timezone.utc).isoformat(), 'origin': base, 'mode': 'anonymous GET only', 'passed': sum(v['ok'] for v in results), 'total': len(results), 'checks': results}
encoded = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
if args.output:
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(encoded, encoding='utf-8')
print(encoded)
raise SystemExit(0 if report['passed'] == report['total'] else 1)
