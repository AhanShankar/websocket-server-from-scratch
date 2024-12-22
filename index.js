import http from "http";
import { createHash } from 'crypto';
import { Frame } from './frame.js';

const GLOABALLY_UNIQUE_IDENTIFIER = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const server = http.createServer(function (req, res) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.write("Websocket server does not support HTTP requests");
    res.end();
}).listen(8080);
server.on("upgrade", (req, socket, head) => {

    const url = req.url;
    const method = req.method;
    if (url == "/chat" && method == "GET") {
        if (!isValidHandshake(req)) {
            socket.write(
                'HTTP/1.1 400 Bad Request\r\n' +
                'Connection: close\r\n' +
                '\r\n'
            );
            return;
        }
    }
    else {
        socket.write(
            'HTTP/1.1 404 Not Found\r\n' +
            'Connection: close\r\n' +
            '\r\n'
        )
        return;
    }

    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${generateAcceptValue(req.headers["sec-websocket-key"])}\r\n` +
        '\r\n'
    );
    socket.on("data", (data) => {
        const frame = new Frame(data);
        if (!frame.mask) {
            socket.end();
            return;
        }
        console.log(frame.transformPayload().toString());
    });
})

/**
 * Validates if the request is a valid handshake for a WebSocket connection
 * @param {http.IncomingMessage} req the request from the client
 * @returns {boolean} true if the request is a valid handshake, false otherwise
 */

function isValidHandshake(req) {
    if (req.httpVersion === "1.0")
        return false
    if (!req.headers.host)
        return false
    if (req.headers.upgrade.toLowerCase() !== "websocket")
        return false
    if (req.headers.connection.toLowerCase() !== "upgrade")
        return false
    if (!req.headers["sec-websocket-key"])
        return false
    const decodedString = Buffer.from(req.headers["sec-websocket-key"], 'base64')
    if (decodedString.length !== 16)
        return false
    // todo: return appropriate error code if the version is not supported
    if (req.headers["sec-websocket-version"] !== "13")
        return false
    return true
}

/**
 * Creates the value for the Sec-WebSocket-Accept header
 * @param {string} key the value of the Sec-WebSocket-Key header form the client
 * @returns {string} the value for the Sec-WebSocket-Accept header
 */

function generateAcceptValue(key) {
    return createHash('sha1').update(key + GLOABALLY_UNIQUE_IDENTIFIER).digest('base64');
}