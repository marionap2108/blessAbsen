from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl
import os
from pathlib import Path

# Custom handler untuk menambahkan header yang diperlukan
class CustomHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Tambahkan header untuk service worker
        self.send_header('Service-Worker-Allowed', '/')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        SimpleHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def generate_self_signed_cert():
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        import datetime

        # Generate key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )

        # Generate certificate
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, u"localhost"),
        ])
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            private_key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).sign(private_key, hashes.SHA256())

        # Write certificate
        with open("cert.pem", "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))

        # Write private key
        with open("key.pem", "wb") as f:
            f.write(private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ))
    except Exception as e:
        print(f"Error generating certificate: {e}")
        raise

# Install required package if not present
try:
    import cryptography
except ImportError:
    print("Installing required package...")
    os.system("pip install cryptography")
    import cryptography

# Generate certificate if not exists
if not (Path("cert.pem").exists() and Path("key.pem").exists()):
    print("Generating self-signed certificate...")
    generate_self_signed_cert()

# Create HTTPS server dengan custom handler
server_address = ('localhost', 8080)
httpd = HTTPServer(server_address, CustomHandler)

# Wrap socket with SSL
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile='cert.pem', keyfile='key.pem')
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print("Server berjalan di https://localhost:8080")
print("Tekan Ctrl+C untuk menghentikan server")

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer dihentikan")
    httpd.server_close() 