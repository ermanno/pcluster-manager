from flask import Response


CORP_HEADERS = [
    {'key': 'Cross-Origin-Resource-Policy', 'default': 'same-site'},
    {'key': 'Cross-Origin-Embedder-Policy', 'default': 'require-corp'}
]

SECURITY_HEADERS = [
    {'key': 'X-Frame-Options', 'default': 'DENY'},
    {'key': 'X-Content-Type-Options', 'default': 'nosniff'},
    {'key': 'Referrer-Policy', 'default': 'strict-origin-when-cross-origin'},
    {'key': 'Strict-Transport-Security', 'default': 'max-age=63072000; includeSubDomains; preload'},
    {'key': 'Permissions-Policy', 'default': 'interest-cohort=()'},
    {'key': 'X-XSS-Protection', 'default': '1; mode=block'}
]

CSP_HEADER = {
    'key': 'Content-Security-Policy',
    'default': "default-src 'self'; style-src 'self' 'unsafe-inline'; font-src data:; img-src 'self' data:; child-src blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none';"
}

def add_security_headers(response: Response):
    for header in [*CORP_HEADERS, *SECURITY_HEADERS, CSP_HEADER]:
        response.headers.setdefault(**header)
    return response


def add_security_headers_dev(response: Response):
    for header in SECURITY_HEADERS:
        response.headers.setdefault(**header)
    return response