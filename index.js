import http from "http";


http.createServer(function (req, res) {
    const url = req.url;
    const method = req.method;
    if (url == "/chat" && method == "GET") {
        if (isValidHandshake(req)) {
            res.writeHead(101, {
                'Upgrade': 'websocket',
                'Connection': 'Upgrade',
                'Sec-WebSocket-Accept': 's3pPLMBiTxaQ9kYGzzhZRbK+xOo='
            });
            res.end();
        }
        else {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end();
            return;
        }
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end();
    }
}).listen(8080);

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