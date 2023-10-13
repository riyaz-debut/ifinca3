'use strict';
class ContactValidator {
    static contact_us_validate(req, res, next) {
        req.checkBody('contact_name', 'Please enter contact name').notEmpty();
        req.checkBody('email', 'Please enter email').notEmpty();
        req.checkBody('user_type', 'Please enter user_type').notEmpty();
        req.checkBody('subject', 'Please enter subject').notEmpty();
        req.checkBody('message', 'Please specify a message for the admin').notEmpty();
        req.checkBody('message', 'Please enter the message max 500 characters only').len(0, 500);
        let error = req.validationErrors();
        if (error) { let message = error[0].msg; res.status(400).json({ success: false, error: "validation error", message: message }); } else { next(); }
    }
}
module.exports = ContactValidator;