const logger = require('elogger');
const mongoose = require('mongoose');
const models = require('../models/auditLogChainSchema');
const Block = require('./block').Block;
const { v4: uuidv4 } = require('uuid');

exports.AuditLogBlockchain = class AuditLogBlockchain {
    constructor() {
        this.difficulty = 3;
    }

    async initialize(uuid, payload) {
        let genesisBlockInfo = await this.getGenesisBlock(uuid);
        if (!genesisBlockInfo) {
            logger.info('Initializing Genesis block . . .');
            let genesisBlockInfo = await this.createGenesisBlock(uuidv4(), payload);
            logger.info(`Genesis block: ${genesisBlockInfo.id}`);
            return genesisBlockInfo.chain_uuid;
        }
        else {
            logger.debug(`Existing Genesis block: ${genesisBlockInfo.id}`);
            return uuid;
        }
    }

    async createGenesisBlock(uuid, payload) {
        let id = new mongoose.Types.ObjectId().toHexString();
        let newblockInfo = new Block(id, payload, new Date().getTime());
        return await this.addNewBlock(uuid, newblockInfo);
    }

    async createTransaction(uuid, payload) {
        let precedingBlockInfo = await this.getPrecedingBlock(uuid);
        if (precedingBlockInfo) {
            let id = new mongoose.Types.ObjectId().toHexString();
            let currentBlockInfo = new Block(id, payload, new Date().getTime(), precedingBlockInfo.hash);
            return await this.addNewBlock(uuid, currentBlockInfo);
        }
        return false;
    }

    async addNewBlock(uuid, blockObj) {
        blockObj.proofOfWork(this.difficulty);
        return this.addBlockToChain(uuid, blockObj);
    }

    async addBlockToChain(uuid, blockInfo) {
        // save new block to chain
        let chainInfo = models.AuditLogChain();
        chainInfo._id = blockInfo.id;
        chainInfo.preceding_hash = blockInfo.preceding_hash;
        chainInfo.data = blockInfo.data;
        chainInfo.hash = blockInfo.hash;
        chainInfo.iterations = blockInfo.iterations;
        chainInfo.created_on = blockInfo.created_on;
        chainInfo.chain_uuid = uuid;
        let chainEntry = await chainInfo.save();
        return chainEntry;
    }

    async getGenesisBlock(uuid) {
        let blockInfo = await models.AuditLogChain.find({ chain_uuid: uuid }).sort({ $natural: 1 }).limit(1);
        return (blockInfo.length > 0) ? blockInfo[0] : null;
    }

    async getPrecedingBlock(uuid) {
        let blockInfo = await models.AuditLogChain.find({ chain_uuid: uuid }).sort({ $natural: -1 }).limit(1);
        return (blockInfo.length > 0) ? blockInfo[0] : null;
    }

    async checkChainValidity(uuid) {
        let promise = new Promise((resolve) => {
            let previousBlock = null;
            let currentBlock = null;
            let idx = 1;
            models.AuditLogChain.find({ chain_uuid: uuid }).sort({ $natural: 1 }).cursor().on('data', entry => {
                logger.info(`Validating Block(${idx}): ${entry.id}`);
                if (previousBlock) {
                    // recreate the block with the info from database
                    currentBlock = new Block(entry.id, entry.data, entry.created_on, entry.preceding_hash);
                    currentBlock.proofOfWork(this.difficulty);

                    // validate computed block hash with database hash entry
                    if (entry.hash !== currentBlock.hash) {
                        logger.error(`Stored hash(${entry.hash}) and computed hash(${currentBlock.hash}) doesn't match`);
                        resolve(false);
                    }
                    else {
                        logger.debug(`Block Computed Hash Validated: ${currentBlock.id} -> SUCCESS`);
                    }

                    // validate chain block with preceding hash
                    if (currentBlock.preceding_hash !== previousBlock.hash) {
                        logger.error(`Previous block hash(${previousBlock.hash}) and preceding block hash(${currentBlock.preceding_hash}) doesn't match`);
                        resolve(false);
                    }
                    else {
                        logger.debug(`Block Preceding Hash Chain Validated: ${currentBlock.id} -> SUCCESS`);
                    }

                    // assign current block as previous block for the next cycle
                    previousBlock = Object.assign({}, currentBlock);
                    idx++;
                }
                else {
                    logger.info(`Genesis Block(${idx}): ${entry.id}`);
                    previousBlock = new Block(entry.id, entry.data, entry.created_on, entry.preceding_hash);
                    previousBlock.proofOfWork(this.difficulty);
                    idx++;
                }
            })
                .on('end', function () {
                    resolve(true);
                });
        });

        return promise;
    }
}