
export class Frame {

    /**
     * @constructor
     * @param {Buffer} buffer 
     */

    constructor(buffer) {
        this.offset = 0;
        this.buffer = buffer;
        this.FIN = (buffer[0] & 0b10000000) === 0b10000000;
        this.opcode = buffer[0] & 0b00001111;
        this.opcode = parseInt(this.opcode, 10);
        this.mask = (buffer[1] & 0b10000000) === 0b10000000;
        this.payloadLength = this.calculatePayloadLength(buffer);

    }

    /**
     * Calculates the payload length according to RFC 6455-5.2
     * @param {Buffer} buffer 
     * @returns {number} the length of the payload in bytes
     */

    calculatePayloadLength(buffer) {
        this.offset = 1;
        const payloadLengthBits = buffer[1] & 0b01111111;
        const payloadLength = parseInt(payloadLengthBits, 10);
        if (payloadLength < 126) {
            return payloadLength;
        }
        else if (payloadLength === 126) {
            this.offset = 2;
            const payloadLength = buffer.readUInt16BE(this.offset);
            this.offset += 2;
            return payloadLength;
        }
        else {
            this.offset = 2;
            const payloadLength = buffer.readBigInt64BE(this.offset);
            this.offset += 8;
            return payloadLength;
        }
    }
}