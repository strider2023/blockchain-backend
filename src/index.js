const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const logger = require('elogger');

const auditRoutes = require("./router/audit.router");

// Connect to MongoDB database
mongoose
    .connect(process.env.MONGO_DB_URL, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
    .then(() => {
        const app = express()
        app.use(cors());
        app.use(bodyParser.json());

        app.use('/api/v1/audit', auditRoutes);

        app.get('/', (req, res) => {
            res.send(`blockchain-backend-service has started on ${process.env.PORT || 6001}`);
        });

        app.listen(process.env.PORT || 6001, () => {
            logger.info(`blockchain-backend--service has started on ${process.env.PORT || 6001}`);
        })
    });

// const { AuditLogBlockchain } = require('./util/auditLogChain');
// const logger = require('elogger');

// //  connect to database
// const mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost:27017/test_blockchain', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     useFindAndModify: false,
//     useCreateIndex: true
// });


// (async() => {
//     let blockChain = new AuditLogBlockchain();
//     await blockChain.initialize();

//     for(let idx=1; idx <= 10; idx++) {
//         let payload = {
//             user: "1",
//             ip: '127.0.0.1',
//             user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97',
//             action: 'TEST_ACTION',
//             rtype: 'TEST',
//             ref_id: 'TEST_00' + idx,
//             created_on: new Date().getTime()
//         };
//         logger.info(`New Block Request: ${payload.ref_id}`);
//         let entry = await blockChain.createTransaction(payload);
//         logger.info(`New Transaction: ${entry.id}`);
//     }

//     let status = await blockChain.checkChainValidity();
//     logger.info(`Chain Status: ${(status)?'SUCCESS':'FAILED'}`);
//     process.exit(0);
// })();