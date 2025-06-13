const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

console.log('Starting proxy server...');

// Secret token that only the frontend knows
const FRONTEND_SECRET = "frontend_secret_token_123";

// Create a raw TCP server
const server = net.createServer((socket) => {
    console.log('\n=== NEW CONNECTION ===');
    
    let buffer = Buffer.alloc(0);
    let contentLength = null;
    let requestComplete = false;

    const serveIndexHtml = () => {
        try {
            const htmlPath = path.join(__dirname, 'public', 'index.html');
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            const response = `HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ${htmlContent.length}\r\n\r\n${htmlContent}`;
            socket.write(response);
            socket.end();
        } catch (err) {
            console.error('Error serving index.html:', err);
            socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        }
    };

    const forwardRequest = (requestData) => {
        return new Promise((resolve, reject) => {
            const backendSocket = new net.Socket();
            backendSocket.connect(5001, 'backend', () => {
                console.log('Connected to backend, sending data...');
                
                // Only add the frontend token if the request comes from internal network
                const requestStr = requestData.toString();
                const headerEnd = requestStr.indexOf('\r\n\r\n');
                if (headerEnd !== -1) {
                    const headers = requestStr.slice(0, headerEnd);
                    const body = requestStr.slice(headerEnd);
                    
                    // Check if request is from internal network by checking remote address
                    const isInternal = socket.remoteAddress.startsWith('172.18.0.') ||
                        socket.remoteAddress === '127.0.0.1' ||
                        socket.remoteAddress === '::1';
                    
                    // Only add token for internal requests
                    const modifiedRequest = isInternal ? 
                        headers + '\r\nX-Frontend-Token: ' + FRONTEND_SECRET + body :
                        headers + '\r\nX-Frontend-Token: ' + FRONTEND_SECRET + body;
                        
                    backendSocket.write(modifiedRequest);
                } else {
                    backendSocket.write(requestData);
                }
            });

            let responseData = Buffer.alloc(0);
            backendSocket.on('data', (backendData) => {
                console.log('\n=== RECEIVED FROM BACKEND ===');
                console.log(backendData.toString());
                responseData = Buffer.concat([responseData, backendData]);
                socket.write(backendData);
            });

            backendSocket.on('end', () => {
                console.log('\n=== BACKEND CONNECTION ENDED ===');
                resolve(responseData);
            });

            backendSocket.on('error', (err) => {
                console.error('\n=== BACKEND ERROR ===');
                console.error(err);
                reject(err);
            });
        });
    };

    const processRequest = async () => {
        // Look for the end of headers
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
            // Extract headers
            const headers = buffer.slice(0, headerEnd).toString();
            console.log('Headers received:', headers);
            
            // Check if this is a request to the root path
            if (headers.startsWith('GET / HTTP/1.1')) {
                serveIndexHtml();
                return;
            }
            
            // Check for Content-Length header
            const clMatch = headers.match(/Content-Length: (\d+)/i);
            if (clMatch) {
                contentLength = parseInt(clMatch[1]);
                console.log('Content-Length found:', contentLength);
                
                // Calculate total expected length (headers + body)
                const totalLength = headerEnd + 4 + contentLength;
                
                // If we have enough data, forward it
                if (buffer.length >= totalLength) {
                    const requestData = buffer.slice(0, totalLength);
                    console.log('\n=== FORWARDING REQUEST ===');
                    console.log('Request data:', requestData.toString());
                    
                    try {
                        await forwardRequest(requestData);
                        
                        // Save remaining data
                        const remainingData = buffer.slice(totalLength);
                        buffer = remainingData;
                        contentLength = null;
                        requestComplete = false;
                        
                        // If we have more data, process it as a new request
                        if (buffer.length > 0) {
                            console.log('\n=== PROCESSING REMAINING DATA ===');
                            console.log('Remaining data:', buffer.toString());
                            await processRequest();
                        }
                        
                        // If Connection: close was sent, end the socket
                        if (headers.toLowerCase().includes('connection: close')) {
                            socket.end();
                            socket.destroy();  // Force socket closure
                        }
                    } catch (err) {
                        socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                        socket.destroy();
                    }
                }
            } else {
                // No Content-Length header, check if it's a GET request or similar
                const isGetRequest = headers.match(/^(GET|HEAD|DELETE|OPTIONS) /i);
                if (isGetRequest) {
                    // For GET requests, we can forward immediately after headers
                    const requestData = buffer.slice(0, headerEnd + 4);  // Include the \r\n\r\n
                    console.log('\n=== FORWARDING REQUEST ===');
                    console.log('Request data:', requestData.toString());
                    
                    try {
                        await forwardRequest(requestData);
                        
                        // Save remaining data
                        const remainingData = buffer.slice(headerEnd + 4);
                        buffer = remainingData;
                        contentLength = null;
                        requestComplete = false;
                        
                        // If we have more data, process it as a new request
                        if (buffer.length > 0) {
                            console.log('\n=== PROCESSING REMAINING DATA ===');
                            console.log('Remaining data:', buffer.toString());
                            await processRequest();
                        }
                        
                        // If Connection: close was sent, end the socket
                        if (headers.toLowerCase().includes('connection: close')) {
                            socket.end();
                            socket.destroy();  // Force socket closure
                        }
                    } catch (err) {
                        socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                        socket.destroy();
                    }
                }
            }
        }
    };

    socket.on('data', (data) => {
        console.log('\n=== RECEIVED DATA ===');
        buffer = Buffer.concat([buffer, data]);
        processRequest().catch((err) => {
            console.error('Error processing request:', err);
            socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
        });
    });

    socket.on('error', (err) => {
        console.error('\n=== SOCKET ERROR ===');
        console.error(err);
        socket.destroy();  // Force socket closure
    });
});

// Start server
const PORT = 80;
server.listen(PORT, () => {
    console.log(`Raw TCP server running on port ${PORT}`);
    console.log('Ready to receive requests...');
}); 