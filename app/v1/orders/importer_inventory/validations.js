'use strict';

class importerinventory {

    static move_data(req, res, next) {
        req.checkBody("id", 'Please provide valid order id.').withMessage().isString().isLength({ min: 24, max: 24 });
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }




    static action_orders(req, res, next) {
        req.checkBody("roasterid", 'Please provide valid  id.').withMessage().isString().isLength({ min: 24, max: 24 });
        req.checkBody('status', 'Please provide the valid status.').isInt({ gt: 0, lt: 4 });
        req.checkBody('mill_process', 'Please provide the mill process.').notEmpty();
        req.checkBody('cup_score', 'Please provide the cup_score.').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
    static selling(req, res, next) {
        req.checkQuery('order_id', 'Please provide the orderId').notEmpty();
        let error = req.validationErrors();
        if (error) {
            let message = error[0].msg;
            res.status(400).json({ success: false, error: "validation error", message: message });
        } else { next(); }
    }
}

module.exports = importerinventory;