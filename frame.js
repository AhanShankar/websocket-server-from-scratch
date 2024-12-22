
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
        if (this.mask) {
            this.maskingKey = buffer.subarray(this.offset, this.offset + 4);
            this.offset += 4;
        }
        // create a new buffer from the offset to the end of the buffer
        this.payload = buffer.subarray(this.offset);
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
            this.offset += 1;
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

    /**
     * Unmasks or masks the payload data using the masking key.
     * @param {Buffer} payloadData - The original data to be transformed.
     * @param {Buffer} maskingKey - A 4-byte masking key.
     * @returns {Buffer} - The transformed data (masked or unmasked).
     */

    transformPayload(payloadData = this.payload, maskingKey = this.maskingKey) {
        if (maskingKey.length !== 4) {
            throw new Error('Masking key must be 4 bytes long');
        }

        const transformedData = Buffer.alloc(payloadData.length);

        for (let i = 0; i < payloadData.length; i++) {
            const j = i % 4; // Index into the masking key
            transformedData[i] = payloadData[i] ^ maskingKey[j]; // XOR operation
        }

        return transformedData;
    }
}