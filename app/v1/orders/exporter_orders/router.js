'use strict';
const express = require('express');
const router = express.Router();
const refExporterOrders = require("./controller");
const orderValidator = require("./validations");
const objExporterOrder = new refExporterOrders();

/* Get method for get pending order list */
router.get('/dashboard', orderValidator.get_pending_orders, (req, res, next) => {
    objExporterOrder.getPendingOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: { orders: result.data, order_stats: result.order_stats }, });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for get progress/completed order list */
router.get('/', orderValidator.get_orders, (req, res, next) => {
    objExporterOrder.getOrders(req.query, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, total_count: result.total_count, pagination_limit: pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Put method for update order */
router.put('/', orderValidator.action_orders, (req, res, next) => {
    objExporterOrder.updateOrder(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Post method for create order */
router.post('/', orderValidator.create_orders, (req, res, next) => {
    objExporterOrder.createOrder(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



/* Post method for create order */
router.post('/update_order', orderValidator.create_orders, (req, res, next) => {
    objExporterOrder.updateOrderdata(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for get pending order details */
router.get('/pending_order_details/:id', orderValidator.get_order, (req, res, next) => {
    objExporterOrder.getPendingOrder(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

/* Get method for get order details */
router.get('/details/:id', orderValidator.get_order, (req, res, next) => {
    objExporterOrder.getOrderDetails(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Post method for emit socket event */
router.post('/emit_socket_event', (req, res, next) => {
    // emit socket event
    io.emit(req.body.event_name, req.body.data);
    res.status(200).send({ message: "emit successfully", status: 1 });
});


/* Put method to complete order by exporter */
router.put('/complete', orderValidator.complete_order, (req, res, next) => {
    objExporterOrder.completeOrder(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


/* Put method to remove farmer in a  order  */
router.post('/remove_farmer', (req, res, next) => {
    objExporterOrder.farmer_remove(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.put('/loading_port', (req, res, next) => {
    objExporterOrder.loadingPort(req.body, req.decoded).then(result => {
        res.status(200).send({ message: "success", status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});

router.get('/my_loading_port', (req, res, next) => {
    objExporterOrder.myloading(req.decoded, req.query).then(result => {
        res.status(200).send({ message: result.message, status: 1, pagination_limit: pagination_limit, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});






////////////////////////////////importer multiple request apit through importer



router.get('/request_active_list', (req, res, next) => {
    objExporterOrder.getPendingActiveOrder(req.query, req.decoded).then(result => {

        res.status(200).send({
            message: result.message,
            pagination_limit: pagination_limit,
            status: 1,
            data: result.data,
        });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



/* Get method for get pending order details */
router.get('/pending_request_details/:id', (req, res, next) => {
    objExporterOrder.getPendingrequest(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data, user_data: result.user_data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});



/* Put method to update importer request exporter fee */
router.put('/update_importer_request', (req, res, next) => {
    objExporterOrder.updateexporterfee(req.body, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


////type-3 exporter order request detail
router.get('/request_detail/:id', (req, res, next) => {
    objExporterOrder.getRequestDetails(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});


router.get('/order_request_detail/:id', (req, res, next) => {
    objExporterOrder.getOrderRequestDetails(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1, data: result.data });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
router.get('/for_price_per_carga', (req, res, next) => {
    objExporterOrder.for_price_per_carga(req.params, req.decoded).then(result => {
        res.status(200).send({ message: result.message, status: 1 });
    }).catch(err => {
        //error handling
        res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
    });
});
module.exports = router;