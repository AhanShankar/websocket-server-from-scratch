import { FIXED_LENGTH } from "./constants";
export class ServerFrame {
    /**
     * @constructor
     * @param {Object} options
     * @param {boolean} options.FIN - true if this is the final frame in the message
     * @param {number} options.opcode - the opcode of the frame
     * @param {string} options.payload - the payload data
     */

    constructor({ FIN, opcode, payload = "" }) {
        this.FIN = FIN;
        this.opcode = opcode;
        this.payloadLength = payload.length;
        this.payload = payload;
    }
    /**
     * Calculates the length of the frame according to RFC 6455-5.2
     * @returns {number} the length of the frame in bytes
     */

    calculateFrameLength() {
        return FIXED_LENGTH + this.calculateExtendedPayloadLength() + this.payloadLength;
    }

    /**
     * Calculates the length of the extended payload length field according to RFC 6455-5.2
     * @returns {number} the length of the payload length field in bytes
     */

    calculateExtendedPayloadLength() {
        if (this.payloadLength < 126)
            return 0;
        else if (this.payloadLength <= 0xFFFF)
            return 2;
        else
            return 8;
    }

    /**
     * Converts the entire frame to a buffer
     * @returns {Buffer} the frame as a buffer
     */

    toBuffer() {
        const buffer = Buffer.alloc(this.calculateFrameLength());
        // left shift FIN to the start and or with 4 bit opcode
        buffer[0] = (this.FIN << 7) | this.opcode;
        if (this.calculateExtendedPayloadLength() === 0)
            buffer[1] = this.payloadLength;
        else if (this.calculateExtendedPayloadLength() === 2) {
            buffer[1] = 126;
            buffer.writeUInt16BE(this.payloadLength, 2);
        }
        else {
            buffer[1] = 127;
            buffer.writeBigInt64BE(this.payloadLength, 2);
        }
        buffer.write(this.payload, FIXED_LENGTH + this.calculateExtendedPayloadLength());
        return buffer;
    }

}