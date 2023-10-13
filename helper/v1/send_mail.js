'use strict';
const Swig = require('swig');
const config = require('../../config');
const NodeMailer = require("nodemailer"); //module to send mail

//create  smtp transport
const SmtpTransport = NodeMailer.createTransport(config.smtp);

// function to send mail using module nodemail
class Email {
    
    static sendMail(to, subject, content) {
        let tpl_swig = Swig.compileFile('public/mail_page/index.html');
        let template = tpl_swig({
            content: content,
            email_logo: config.env.serviceUrl + 'images/logo.svg',
            email_bottom_logo: config.env.serviceUrl + 'images/logo-bottom.svg',
            site_url: config.env.serviceUrl,
            project_name: global.project_name,
            support_email: global.support_email
        });
        SmtpTransport.sendMail({
            from: global.admin_email, // sender address from configuration collection
            to: to, // user email_id
            subject: subject,// Subject line
            // cc:global.admin_email_cc, 
            html: template
        }, (mailError, info) => {
            if (!mailError) {
                console.log("mail_info ");
                console.log(info.response);
                console.log(info.messageId);
            } else {
                console.log("mail_error ");
                console.log(mailError);
            }
        });
    }
    static cc_sendMail(to, subject, content) {
        let tpl_swig = Swig.compileFile('public/mail_page/index.html');
        let template = tpl_swig({
            content: content,
            email_logo: config.env.serviceUrl + 'images/logo.svg',
            email_bottom_logo: config.env.serviceUrl + 'images/logo-bottom.svg',
            site_url: config.env.serviceUrl,
            project_name: global.project_name,
            support_email: global.support_email
        });
        SmtpTransport.sendMail({
            from: global.admin_email, // sender address from configuration collection
            to: to, // user email_id
            subject: subject,
            cc:global.mail_cc, // Subject line
            html: template
        }, (mailError, info) => {
            if (!mailError) {
                console.log("mail_info ");
                console.log(info.response);
                console.log(info.messageId);
            } else {
                console.log("mail_error ");
                console.log(mailError);
            }
        });
    }
}
module.exports = Email;

