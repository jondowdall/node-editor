import argparse
import http.server
import socketserver
import os

PORT = 8800

class Handler(http.server.SimpleHTTPRequestHandler):
    """Handle HTTP requests"""

    def _set_headers(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()

    def do_PUT(self):
        """Handle a put request by saving to disk."""
        path = self.translate_path(self.path)
        print("PUT request", path)
        if path.endswith('/'):
            self.send_response(405, "Method Not Allowed")
            self.wfile.write("PUT not allowed on a directory\n".encode())
            return
        else:
            try:
                os.makedirs(os.path.dirname(path))
            except FileExistsError: pass
            length = int(self.headers['Content-Length'])
            with open(path, 'wb') as f:
                f.write(self.rfile.read(length))
            self.send_response(201, "Created")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()

    parser.add_argument('port', action='store',
                        default=8000, type=int,
                        nargs='?',
                        help='Specify alternate port [default: 8000]')
    args = parser.parse_args()

    httpd = socketserver.TCPServer(("", args.port), Handler)
    print("serving at port", args.port)
    httpd.serve_forever()
