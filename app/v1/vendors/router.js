'use strict';
const express = require('express');
const router = express.Router();
const refVendors = require("./controller");
const vendorValidation = require("./validations");
const objVendor = new refVendors();

//search vendors
router.get('/search', vendorValidation.search_vendors, (req, res, next) => {
    objVendor.searchVendors(req.decoded, req.query).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Post method for add vendor request */
router.post('/vendor_request', vendorValidation.add_vendor_req_validate, (req, res, next) => {
    objVendor.addVendorRequest(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
/* get pending add assets request list  */
router.get('/pending_vendor_request',(req, res, next) => {
    objVendor.pendingRequest(req.decoded).then(result => {
        console.log(result,"jkdlfjdasfkljasdfkjadfklasdjfkljsdf")
        res.status(200).send({ message: result.message, status: 1,data:result.data});
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



router.get('/pending_vendor_request_send',(req, res, next) => {
    objVendor.pendingRequestSend(req.decoded).then(result => {
        console.log(result,"jkdlfjdasfkljasdfkjadfklasdjfkljsdf")
        res.status(200).send({ message: result.message, status: 1,data:result.data});
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Post method for add my vendor */
router.post('/', vendorValidation.vendor_id_validate, (req, res, next) => {
    objVendor.addVendor(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.post('/accept', (req, res, next) => {

    objVendor.addAcceptVendor(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.get('/count_pending_request', (req, res, next) => {

    objVendor.countPendingRequest(req.body, req.decoded).then(result => {

        console.log(result,"this is data fo rthis api")
        res.status(200).send({ message: result.message, status: 1, count: result.data ,count_send:result.count_data});
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Delete method for remove vendor from my vendor */
router.put('/', vendorValidation.vendor_id_validate, (req, res, next) => {
    objVendor.removeVendor(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for get my vendors */
router.get('/', vendorValidation.get_vendors, (req, res, next) => {
    objVendor.getVendor(req.decoded, req.query).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



/* Get method for get my vendors in roaster and cafe commaon api */
router.get('/exist_all', vendorValidation.get_vendors, (req, res, next) => {
    objVendor.getExistAllVendors(req.decoded, req.query).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data ,all:result.all});
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//search loading portname
router.get('/search_loading_port', (req, res, next) => {
    objVendor.searchloadingport(req.decoded, req.query).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Post method for add loading port */
router.post('/add_loading_port', (req, res, next) => {
    objVendor.addloading(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



//loading port  add GLobally 
router.post('/port_add', async (req, res, next) => {//validation check
    objVendor.loading_add_data(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
  
})


//destination port  add GLobally 
router.post('/destination_add_data', async (req, res, next) => {//validation check
    objVendor.destination_add_data(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
  
})

/* get  method for loading port by per exporter */
router.get('/my_loading_port', (req, res, next) => {
    objVendor.myloading(req.decoded,req.query).then(result => {
        console.log("result value is",result)
        res.status(200).send({ message: result.message, status: 1,pagination_limit: pagination_limit,data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


//search destination portname
router.get('/search_destination_port', (req, res, next) => {
    objVendor.searchdestinationport(req.decoded, req.query).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Post method for add destination port */
router.post('/add_destination_port', (req, res, next) => {
    objVendor.adddestination(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* get  method for destination port by per exporter */
router.get('/my_destination_port', (req, res, next) => {
    objVendor.mydestination(req.decoded,req.query).then(result => {
        console.log("result value is",result)
        res.status(200).send({ message: result.message, status: 1,pagination_limit: pagination_limit,data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
module.exports = router;