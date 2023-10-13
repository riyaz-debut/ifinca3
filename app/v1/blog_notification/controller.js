const config = require("../../../config");
const blogs = require("./model");

//helper to send push notificaation to app using firebase
const fcm = require('fcm-push'); //node module for sending pi=ush notification
const fcm_push = new fcm(config.push_notification.server_key); //pass server key to fcm
const mongoose = require("mongoose");

class blog_notification {

    //get notifictions
    async getNotifications(data, decoded) {
        try {
            let find_notifications = await blogs.aggregate([
                { $match: { "to": mongoose.Types.ObjectId(decoded._id) } },
                { $sort: { _id: -1 } },

            ]);
            return Promise.resolve({ message: "success", data: find_notifications, pagination_limit: 20 });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }



    //get notifictions counts
    async getNotificationsCount(decoded) {
        try {
            let notifications_count = await blogs.count({ "to": mongoose.Types.ObjectId(decoded._id), status: 0 });
            return Promise.resolve({ message: "success", data: notifications_count });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    //get notifictions counts
    async readNotification(decoded) {
        try {
            await blogs.updateMany({ "to": mongoose.Types.ObjectId(decoded._id), status: 0 }, { status: 1 });
            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }
    //delete notifictions counts
    async deleteNotification(id) {
        try {
            await blogs.deleteOne({ "_id": mongoose.Types.ObjectId(id) });
            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }
}

module.exports = blog_notification;