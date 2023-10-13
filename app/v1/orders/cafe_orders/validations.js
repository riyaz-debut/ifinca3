'use strict';

class Orders {

    static get_order_details(req, res, next) {
        req.checkParams('order_no', 'Please provide the order no.').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static get_orders(req, res, next) {
        req.checkQuery('type', 'Please provide the valid type.').notEmpty().isInt({ gt: 0, lt: 4 });;
        req.checkQuery('page', 'Please provide the page number.').notEmpty();
        req.checkQuery('page', 'Please provide the valid page number.').isInt({ gt: 0 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static order_action(req, res, next) {
        req.checkBody('id', 'Please provide the id.').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static add_history(req, res, next) {
        req.checkBody('order_no', 'Please provide the order no.').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

    static get_history(req, res, next) {
        req.checkQuery('page', 'Please provide the page number.').notEmpty();
        req.checkQuery('page', 'Please provide the valid page number.').isInt({ gt: 0 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
    static update_docs(req, res, next) {
        if (req.body.type === 3) {
            req.checkBody('link', 'Please provide the valid link of file.').notEmpty();
        } else {
            req.checkBody('type', 'Please provide the type of file.').notEmpty();
            req.checkBody('link', 'Please provide the valid link of file.').notEmpty();
            req.checkBody('order_id', 'Please provide the valid link of file.').notEmpty();
            req.checkBody('_id', 'Please provide the id of user.').notEmpty();
            req.checkBody('name', 'Please provide the name of file.').notEmpty();
        }
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
    static delete_docs(req, res, next) {
        req.checkBody('type', 'Please provide the type of file.').notEmpty();
        req.checkBody('link', 'Please provide the valid link of file.').notEmpty();
        req.checkBody('order_id', 'Please provide the valid link of file.').notEmpty();
        req.checkBody('name', 'Please provide the name of file.').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
    static warehouse_add(req, res, next) {
        req.checkQuery('order_id', 'Please provide the orderId').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }

}

module.exports = Orders;