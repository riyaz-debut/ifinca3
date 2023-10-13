'use strict';

class Order {
    static getOrder(req, res, next) {
        req.checkParams('order_no', 'Please enter valid order no.').exists().notEmpty().isString();
        // validation errors
        let error = req.validationErrors(); if (error) { let message = error[0].msg; return res.status(422).json({ message: message, key: error[0].param }); } else { next(); }
    }

    static CreateOrder(req, res, next) {
        req.checkBody('order_no', 'Please enter valid order no.').exists().notEmpty().isString();
        req.checkBody('quantity', 'Please enter valid quantity.').exists().notEmpty();
        req.checkBody('delivery_date', 'Please enter valid delivery date.').exists().notEmpty();
        req.checkBody('base_unit', 'Please enter valid base unit.').exists().notEmpty().isString();
        req.checkBody('ifinca_bonus', 'Please enter valid ifinca bonus.').exists().notEmpty();
        req.checkBody('price', 'Please enter valid price.').exists().notEmpty();
        req.checkBody('price_unit', 'Please enter valid price unit.').exists().notEmpty().isString();
        req.checkBody('exporter_delivery_date', 'Please enter valid exporter delivery date.').exists().notEmpty();
        req.checkBody('importer_delivery_date', 'Please enter valid importer delivery date.').exists().notEmpty();
        req.checkBody('importers', 'Please provide importers.').isArray().notEmpty();
        // validation errors
        let error = req.validationErrors(); if (error) { let message = error[0].msg; return res.status(422).json({ message: message, key: error[0].param }); } else { next(); }
    }

    static CreateSubOrders(req, res, next) {
        req.checkBody('sub_orders.*.supplier._id', 'Please provide valid supplier id.').notEmpty().isLength({ min: 24, max: 24 });
        req.checkBody('sub_orders.*.supplier.name', 'Please provide valid supplier name.').notEmpty();
        req.checkBody('sub_orders.*.supplier.type', 'Please provide valid supplier type.').notEmpty();
        req.checkBody('sub_orders.*.supplier.phone', 'Please provide valid supplier phone.').notEmpty();
        req.checkBody('sub_orders.*.vendors.*._id', 'Please provide valid supplier id.').notEmpty().isLength({ min: 24, max: 24 });
        req.checkBody('sub_orders.*.vendors.*.name', 'Please provide valid supplier name.').notEmpty();
        req.checkBody('sub_orders.*.vendors.*.type', 'Please provide valid supplier type.').notEmpty();
        req.checkBody('sub_orders.*.vendors.*.phone', 'Please provide valid supplier phone.').notEmpty();
        req.checkBody('sub_orders.*.quantity', 'Please enter valid quantity.').exists().notEmpty();
        req.checkBody('sub_orders.*.status', 'Please enter valid status.').exists().notEmpty();
        // validation errors
        let error = req.validationErrors(); if (error) { let message = error[0].msg; return res.status(422).json({ message: message, key: error[0].param }); } else { next(); }
    }

}

module.exports = Order;