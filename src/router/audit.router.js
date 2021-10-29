const express = require("express");
const router = express.Router();
const logger = require('elogger');
var QRCode = require('qrcode');

const { AuditLogBlockchain } = require('../util/auditLogChain');
const { AuditLogChain } = require('../models/auditLogChainSchema');

router.get("/", async (req, res) => {
    try {
        let page = req.query.page || 1;
        let count = req.query.count || 10;
        let modelData = {
            total: 0,
            result: [],
            currentPage: page
        };
        try {
            const uniqueAuditCount = await AuditLogChain.aggregate(
                [
                    {
                        "$group": {
                            "_id": "$chain_uuid",
                            "data": { "$max": "$data" }
                        }
                    }
                ]
            );
            modelData.total = JSON.parse(JSON.stringify(uniqueAuditCount)).length;
            // const audits = await AuditLogChain.find({}, "-_id -__v", { skip: ((page - 1) * count), limit: parseInt(count) });
            const audits = await AuditLogChain.aggregate(
                [
                    {
                        "$group": {
                            "_id": "$chain_uuid",
                            "data": { "$max": "$data" }
                        }
                    },
                    { "$limit": parseInt(count) },
                    { "$skip": ((page - 1) * count) }
                ]
            );
            modelData.result = JSON.parse(JSON.stringify(audits));
            res.send({ message: `Found ${modelData.total} results`, data: modelData })
        } catch (e) {
            logger.error(e.message);
            res.status(500).send({ message: e.message, data: [] });
        }
    } catch (e) {
        logger.error(e.message);
        res.status(500).send({ message: e.message, data: {} });
    }
});

router.get("/qr/:chainId", async (req, res) => {
    try {
        const qrCode = await QRCode.toDataURL(req.params.chainId);
        res.send({ message: "", data: qrCode });
    } catch (e) {
        logger.error(e);
        res.status(500).send({ message: e.message, data: {} });
    }
});

router.get("/trail/:chainId", async (req, res) => {
    try {
        const audits = await AuditLogChain.find({ chain_uuid: req.params.chainId }, "data");
        res.send({ message: "QR Code generated successfully.", data: JSON.parse(JSON.stringify(audits)) });
    } catch (e) {
        logger.error(e);
        res.status(500).send({ message: e.message, data: {} });
    }
});

router.get("/validate/:chainId", async (req, res) => {
    try {
        const chainId = req.params.chainId;
        let blockChain = new AuditLogBlockchain();
        let response = await blockChain.initialize(chainId, null);

        let status = await blockChain.checkChainValidity(chainId);
        logger.info(`Chain Status: ${(status) ? 'SUCCESS' : 'FAILED'}`);

        if (status) {
            res.send({ message: "Audit trail valid.", data: response })
        } else {
            res.send({ message: "Audit trail has been tampered.", data: {} });
        }
    } catch (e) {
        logger.error(e);
        res.status(500).send({ message: e.message, data: {} });
    }
});

router.post("/", async (req, res) => {
    try {
        let request = req.body;
        let blockChain = new AuditLogBlockchain();
        let response = await blockChain.initialize(null, request);
        let status = await blockChain.checkChainValidity();
        logger.info(`Chain Status: ${(status) ? 'SUCCESS' : 'FAILED'}`);

        if (status) {
            res.send({ message: "New block successfully created.", data: response })
        } else {
            res.status(500).send({ message: "Failed to create genesis block", data: {} });
        }
    } catch (e) {
        logger.error(e);
        res.status(500).send({ message: e.message, data: {} });
    }
});

router.patch("/:chainId", async (req, res) => {
    try {
        const chainId = req.params.chainId;
        let request = req.body;
        let blockChain = new AuditLogBlockchain();
        let response = await blockChain.initialize(chainId, request);

        let status = await blockChain.checkChainValidity(chainId);
        logger.info(`Chain Status: ${(status) ? 'SUCCESS' : 'FAILED'}`);

        if (status) {
            let entry = await blockChain.createTransaction(chainId, request);
            logger.info(`Updated Audit Transaction: ${entry.id}`);

            res.send({ message: "Audit trail successfully updated.", data: response })
        } else {
            res.status(500).send({ message: "Failed to add new audit log. Trail has been tampered.", data: {} });
        }
    } catch (e) {
        logger.error(e);
        res.status(500).send({ message: e.message, data: {} });
    }
});

router.delete("/:chainId", async (req, res) => {
    try {

    } catch (e) {
        logger.error(e);
        res.status(500).send({ message: e.message, data: {} });
    }
});

module.exports = router;