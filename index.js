import http from "http";
import { createHash } from 'crypto';
import { ClientFrame } from "./ClientFrame.js";
import { ServerFrame } from "./ServerFrame.js";
import { Duplex } from "stream";
import { GLOABALLY_UNIQUE_IDENTIFIER, FRAME_TYPES, SECOND } from "./constants.js";

let pongRecieved = false;
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
    setInterval(() => poll(socket), 5 * SECOND);
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
    const frame = new ClientFrame(data);
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

        else if (frame.opcode === FRAME_TYPES.PONG) {
            console.log("Received pong frame")
            pongRecieved = true;
        }
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

function sendFrame(socket, type, payload = "") {
    if (!socket.writable)
        return;
    const frame = new ServerFrame({ FIN: true, opcode: type, payload });
    // get key from opcode

    if (type === FRAME_TYPES.PONG)
        console.log("Sending pong frame");
    else if (type === FRAME_TYPES.PING)
        console.log("Sending ping frame");
    else if (type === FRAME_TYPES.CLOSE)
        console.log("Sending close frame");
    else if (type === FRAME_TYPES.TEXT)
        console.log("Sending message", payload);

    socket.write(frame.toBuffer());
}
/**
 * Validates if the request is a valid handshake for a WebSocket connection
 * @param {http.IncomingMessage} req the request from the client
 * @returns {boolean} true if the request is a valid handshake, false otherwise
 */

function isValidHandshake(req) {
    return !(req.httpVersion === "1.0" || 
        !req.headers.host || 
        req.headers.upgrade.toLowerCase() !== "websocket" || 
        req.headers.connection.toLowerCase() !== "upgrade" || 
        !req.headers["sec-websocket-key"] || 
        Buffer.from(req.headers["sec-websocket-key"], 'base64').length !== 16 || 
        req.headers["sec-websocket-version"] !== "13");
}

/**
 * Creates the value for the Sec-WebSocket-Accept header
 * @param {string} key the value of the Sec-WebSocket-Key header form the client
 * @returns {string} the value for the Sec-WebSocket-Accept header
 */

function generateAcceptValue(key) {
    return createHash('sha1').update(key + GLOABALLY_UNIQUE_IDENTIFIER).digest('base64');
}

/**
 * Polls the client to check if the connection is still active
 * @param {Duplex} socket 
 */

async function poll(socket) {
    pongRecieved = false;
    sendFrame(socket, FRAME_TYPES.PING);
    await delay(0.5 * SECOND);
    if (!pongRecieved) {
        console.log("Connection closed due to inactivity");
        socket.end();
    }
}

/**
 * Simulates a delay
 * @param {number} ms the number of milliseconds to delay
 */

async function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}