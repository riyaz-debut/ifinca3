'use strict'
class OrderValidator {
    // validator orderid
    static orderById(req, res, next) {
        req.checkQuery('order_id', 'Please provide the order id').notEmpty();
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static getNotesbyId(req, res, next) {
        req.checkQuery('order_id', 'Please provide the order id').notEmpty();
        req.checkQuery('user_id', 'Please provide the user id').notEmpty();
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

    static getPdf(req, res, next) {
        req.checkBody('order_no', 'Please provide order_no.').notEmpty();
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }

}
module.exports = OrderValidator;