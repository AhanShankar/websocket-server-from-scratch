import http from "http";
import { createHash } from 'crypto';
import { Frame } from './frame.js';
import { Duplex } from "stream";

const GLOABALLY_UNIQUE_IDENTIFIER = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const FRAME_TYPES = {
    CONTINUATION: 0,
    TEXT: 1,
    BINARY: 2,
    CLOSE: 8,
    PING: 9,
    PONG: 10
}
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
    console.log("Connection established");
    socket.on("data", (data) => {
        try {
            handleData(data, socket);
        } catch (err) {
            console.error(err);
        }
    });
})

/**
 * handles the data received from the client
 * @param {Buffer} data 
 */

function handleData(data, socket) {
    const frame = new Frame(data);
    if (!frame.mask) {
        socket.end();
        return;
    }
    if (frame.isControlFrame) {

        // close frame
        if (frame.opcode === FRAME_TYPES.CLOSE) {
            console.log("Received close frame");
            sendFrame(socket, FRAME_TYPES.CLOSE);
            socket.end();
            return;
        }
        else if (frame.opcode === FRAME_TYPES.PING)
            sendFrame(socket, FRAME_TYPES.PONG);

        else if (frame.opcode === FRAME_TYPES.PONG)
            console.log("Received pong frame")
    }
    else {
        // todo: handle fragmentation
        const unmaskedPayload = frame.transformPayload().toString()
        console.log("Received message", unmaskedPayload);
        sendFrame(socket, FRAME_TYPES.TEXT, unmaskedPayload);
    }
}

/**
 * Sends a frame to the client
 * @param {Duplex} socket 
 * @param {number} type 
 * @param {any} payload 
 */

function sendFrame(socket, type, payload) {
    if (!socket.writable)
        return;
    let buffer;
    if (type === FRAME_TYPES.CLOSE) {
        console.log("Sending close frame");
        buffer = Buffer.alloc(2);
        buffer[0] = 0b10001000;
        buffer[1] = 0;
    }
    else if (type === FRAME_TYPES.TEXT) {
        const payloadBuffer = Buffer.from(payload);
        buffer = Buffer.alloc(payloadBuffer.length + 2);
        buffer[0] = 0b10000001; // todo: handle fragmentation
        buffer[1] = payloadBuffer.length;
        payloadBuffer.copy(buffer, 2);
    }
    else if (type === FRAME_TYPES.PONG) {
        console.log("Sending pong frame");
        buffer = Buffer.alloc(2);
        buffer[0] = 0b10001010;
        buffer[1] = 0;
    }
    else if (type === FRAME_TYPES.PING) {
        console.log("sending ping frame");
        buffer = Buffer.alloc(2);
        buffer[0] = 0b10001001;
        buffer[1] = 0;
    }
    socket.write(buffer);
}
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