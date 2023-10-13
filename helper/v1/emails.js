const mongoose = require("mongoose"); //for finding email template
const email_template = mongoose.model("email_template"); //for finding email template
const Email = require('./send_mail'); // helper for send mai through node mailer

class Mail {

    static async send(userData, otp_code, type) {
        try {

            //email remplate for otp verification
            let name = "";
            switch (type) {
                case 1:
                    name = "forgot_password_app_user";
                    break;
                case 2:
                    name = "change_email_otp_verification";
                    break;
                case 3:
                    name = "email_confirmation";
                    break;
            }

            let emailTemplate = await email_template.findOne({ unique_name: name });
            if (emailTemplate) {
                let subject = emailTemplate.subject;
                let content = emailTemplate.content;
                //set the content of email template
                subject = subject.replace(/@project_name@/g, global.project_name);
                content = content.replace(/@project_name@/g, global.project_name);
                content = content.replace("@name@", userData.name);
                content = content.replace("@otp_code@", otp_code);
                Email.sendMail(userData.email, subject, content);
            }
        } catch (err) {
            console.log(err);
            return { status: 0, message: err.message }
        }
    }
}
module.exports = Mail;
