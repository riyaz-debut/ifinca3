'use strict';
const mongoose = require('mongoose'); //orm for database
const email_template = mongoose.model("email_template"); //require model otps
const contactUs = require("./model"); // require model users
const Email = require('../../../helper/v1/send_mail'); // helper for send mai through node mailer
const refNotifications = require("../notifications/controller");
const utils = require("../notifications/utils");
const push_messages = require('../../../locales/en_push');
const userClass = require("./../user/controller");
const refUser = new userClass();


//Class for ContactUs
class ContactUs {

    // for create contact-us request
    async create(body) {
        try {

            //save contact request
            let contactReq = await contactUs.create(body);
            if (!contactReq) {
                return Promise.reject({ message: "Something went wrong.", httpStatus: 400 })
            }

            // send mail to admin
            let p1 = await new Promise(async (resolve, reject) => {
                try {
                    let contactUsAdmin = await email_template.findOne({ unique_name: "contact_us_admin" });
                    if (!contactUsAdmin) {
                        return reject({ message: "email template not found.", status: 0, http_status: 500 });
                    }

                    let subject = contactUsAdmin.subject;
                    let content = contactUsAdmin.content;

                    //set the content of email template
                    content = content.replace("@email@", body.email);
                    content = content.replace("@subject@", body.subject);
                    content = content.replace("@message@", body.message);
                    Email.sendMail(global.admin_email, subject, content);
                    return resolve();
                } catch (err) {
                    return reject({ message: err.message, httpStatus: 400 })
                }
            });

            // send thanku mail to user
            let p2 = await new Promise(async (resolve, reject) => {
                try {
                    let contactUsUser = await email_template.findOne({ unique_name: "thank_you_mail_contact" });
                    if (!contactUsUser) {
                        return reject({ message: "email template not found.", http_status: 500 });
                    }

                    let subject = contactUsUser.subject;
                    let content = contactUsUser.content;

                    //set the content of email template
                    content = content.replace("@name@", body.contact_name);
                    Email.sendMail(body.email, subject, content);
                    return resolve();
                } catch (err) {
                    return reject({ message: err.message, httpStatus: 400 })
                }
            });

            let role = refUser.getUserRole(body.type)
            let admin_push_message = push_messages.admin.contactUsQuery;
            admin_push_message = admin_push_message.replace('@role@', role);
            admin_push_message = admin_push_message.replace('@username@', body.contact_name);

            let objNotifications = new refNotifications();

            // insert many in app notifications
            objNotifications.addInAppNotification("111111111111111111111111", "111111111111111111111111", "", utils.admin.contactUsQuery, admin_push_message);

            Promise.all([p1, p2]).then(() => { }).catch(error => {
                console.log(error);
            });

            return Promise.resolve({ message: messages.contactUsSuccess });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }
}

module.exports = ContactUs;