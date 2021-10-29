const crypto = require("crypto-js");

exports.Block = class Block {
    constructor(id, data, created_on, precedingHash='N/A') {
        this.id = id;
        this.data = data;
        this.created_on = created_on;
        this.preceding_hash = precedingHash;
        this.hash = this.computeHash();
        this.iterations = 0;
    }

    computeHash() {
        return crypto.SHA512(
            this.id +
            this.preceding_hash +
            this.timestamp +
            JSON.stringify(this.data) +
            this.iterations
        ).toString();
    }

    proofOfWork(difficulty) {
        while (
            this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")
        ) {
            this.iterations++;
            this.hash = this.computeHash();
        }
    }
}

