#!/usr/bin/python3

import http.server
import socketserver

def main():
    PORT    = 8000
    Handler = http.server.SimpleHTTPRequestHandler

    try:
        httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
        print("serving at port", PORT)
        httpd.serve_forever()
    finally:
        print("closing server...")
        httpd.server_close()
    
if __name__ == "__main__":
    """ This is executed when run from the command line """
    main()
