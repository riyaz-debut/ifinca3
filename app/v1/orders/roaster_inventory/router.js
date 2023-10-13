'use strict';
const express = require('express');
const router = express.Router();
const refimporterinventorys = require("./controller");
const orderValidator = require("./validations");
const objimporter = new refimporterinventorys();

// orderValidator.get_orders,

router.get('/', (req, res, next) => {
    objimporter.getAllOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: result.data, total_count: result.total_count });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Get method for get order details */
router.get('/order_detail', (req, res, next) => {
    objimporter.getOrderDetail(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
/* Get method for get order details */
router.get('/roaster_order/:order_no', (req, res, next) => {
    objimporter.getsearchOrderDetail(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.put('/mark_as_received', (req, res, next) => {
    objimporter.markAsReceived(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method to mark as complete order */
router.put('/mark_as_complete', (req, res, next) => {
    objimporter.markAsComplete(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});




//////////////////////////inventory

///////////////////////////////////importer inventory
/* move to inventory */
router.post('/move_inventory', (req, res, next) => {
    objimporter.moveinventory(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.get('/inventory_list', (req, res, next) => {
    objimporter.getinventory(req.query, req.decoded).then(result => {
        res.status(200).send({
            message: result.message,
            pagination_limit: pagination_limit,
            status: 1,
            data: result.data,
            // total: result.data[0].total
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Get method for get order details */
router.get('/details/:id', (req, res, next) => {
    objimporter.getinventoryDetails(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/////////////////////
router.post('/cafe_add', (req, res, next) => {
    objimporter.addCafe(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

router.get('/cafe', (req, res, next) => {
    objimporter.getCafe(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

//globally importer inventory list get in roaster
router.get('/global_inventory', (req, res, next) => {
    objimporter.inventoryList(req.query, req.decoded).then(result => {
        console.log("result is", result)
        res.status(200).send({ message: result.message, status: 1, data: result.data[0].data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



//get all assets
router.get('/global_inventory', (req, res, next) => {
    objimporter.inventoryList(req.query, req.decoded).then(result => {
        console.log("result is", result)
        res.status(200).send({ message: result.message, status: 1, data: result.data[0].data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/////////////////////inventory request post api from roaster
router.post('/inventory_reqest', (req, res, next) => {
    objimporter.request(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})

router.post('/make_batch', (req, res, next) => {
    objimporter.make_batch(req.body, req.decoded).then(result => {
        res.status(200).send({
            message:result.message,
            status: 1,
            data:result.data
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
router.put('/confirm_batch', (req, res, next) => {
    objimporter.confirm_batch(req.query, req.decoded).then(result => {
        console.log("step ====4");
        res.status(200).send({
            message:result.message,
            status: 1,
            data:result.data
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.delete('/remove_batch_onback_press', (req, res, next) => {
    objimporter.remove_batch_onback_press(req.query, req.decoded).then(result => {
        res.status(200).send({
            message:result.message,
            status: 1,
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.get('/roasted_batch_listing', (req, res, next) => {
    objimporter.roasted_batch_listing(req.query, req.decoded).then(result => {
        res.status(200).send({
            message:result.message,
            status: 1,
            data:result.data,
            pagination_limit:result.pagination_limit
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.get('/roasted_batch_detail', (req, res, next) => {
    objimporter.roasted_batch_detail(req.query, req.decoded).then(result => {
        res.status(200).send({
            message:result.message,
            status: 1,
            data:result.data
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Put method to update the order docs */
router.put('/update_docs',(req, res, next) => {
    objimporter.update_docs(req.body, req.decoded).then((result) => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch((err) => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
});



/** remove method for docs or image from the order */
router.put('/remove_docs', (req, res, next) => {
    objimporter.remove_docs(req.body, req.decoded).then((result) => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch((err) => {
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    })
})


router.post('/ship_cafe', (req, res, next) => {
    objimporter.shipCafe(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

module.exports = router;