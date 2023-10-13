const config = require("../../../config");
const notifications = require("./model");

//helper to send push notificaation to app using firebase
const fcm = require('fcm-push'); //node module for sending pi=ush notification
const fcm_push = new fcm(config.push_notification.server_key); //pass server key to fcm
const mongoose = require("mongoose");

class Notification {

    //get notifictions
    async getNotifications(data, decoded) {
        try {
            let find_notifications = await notifications.aggregate([
                { $match: { "to": mongoose.Types.ObjectId(decoded._id) } },
                { $sort: { _id: -1 } },
                { $skip: 20 * (data.page - 1) },
                { $limit: 20 },
                { $lookup: { from: "users", localField: "from", foreignField: "_id", as: "user_data" } },
                { $unwind: { path: "$user_data", "preserveNullAndEmptyArrays": true } },
                {
                    $project: {
                        "_id": "$_id",
                        "status": "$status",
                        "message": "$message",
                        "type": "$type",
                        "image": "$user_data.profile_pic",
                        "reference_id": "$reference_id",
                        "created_at": "$created_at",
                        "image_thumbnail": "$user_data.profile_pic_thumbnail"
                    }
                }
            ]);
            return Promise.resolve({ message: "success", data: find_notifications, pagination_limit: 20 });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    //get notifictions counts
    async getNotificationsCount(decoded) {
        try {
            let notifications_count = await notifications.count({ "to": mongoose.Types.ObjectId(decoded._id), status: 0 });
            return Promise.resolve({ message: "success", data: notifications_count });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    //get notifictions counts
    async readNotification(id) {
        try {
            await notifications.updateOne({ "_id": mongoose.Types.ObjectId(id), status: 0 }, { status: 1 });
            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    //delete notifictions counts
    async deleteNotification(id) {
        try {
            await notifications.deleteOne({ "_id": mongoose.Types.ObjectId(id) });
            return Promise.resolve({ message: "success" });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 })
        }
    }

    // send notifications to specific user async
    sendNotification(token, data) {
        let message = {
            to: token, // token of mobile app
            priority: "high",
            notification: {
                title: global.project_name,
                sound: 'default',
                body: data.body,
                'content-available': "true",
                click_action: "FLUTTER_NOTIFICATION_CLICK",
                event_type: data.type,
                sid: data.sid,
                type: data.type,
            },
            data: data
        };
        console.log(message)
        fcm_push.send(message, function(err, response) {
            if (err) {
                console.log("push notification err");
                console.log(err);
            } else {
                console.log("push notification response");
                console.log(response);
            }
            return (1);
        });
    }

    //send same notification to multiple users async
    sendSamePayloadToAll(tokens, data) {
        var token_array;
        while (tokens.length) {
            token_array = tokens.splice(0, 1000);
            var message = {
                registration_ids: token_array,
                priority: "high",
                notification: {
                    title: global.project_name,
                    sound: 'default',
                    body: data.body,
                    'content-available': "true",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    event_type: data.type,
                    type: data.type,
                },
                data: data
            };
            fcm_push.send(message, function(err, response) {
                if (err) {
                    console.log("push notification error");
                    console.log(err);
                } else {
                    console.log("push notification send");
                    console.log(response);
                }
            });
        }
        return (1);
    }

    //different message send to different user push notification
    sendDiffPayload(dataArray) {
        dataArray.forEach(obj => {
            let message = {
                to: obj.token,
                priority: "high",
                notification: {
                    title: global.project_name,
                    sound: 'default',
                    body: obj.body,
                    'content-available': "true",
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    event_type: obj.type,
                    type: data.type,
                },
                data: data.sent_data
            };
            fcm_push.send(message, function(err, response) {
                if (err) {
                    console.log("push notification err");
                    console.log(err);
                } else {
                    console.log("push notification response");
                    console.log(response);
                }
                return (1);
            });
        });
    }

    //add in-app notifiction
    async addInAppNotification(from, to, dataid, type, message) {
        try {
            let data = {
                reference_id: dataid,
                from: from,
                to: to,
                type: parseInt(type),
                message: message,
            };
            console.log(data)
            await notifications.create(data);
        } catch (err) {
            console.log("error in insertion of notification");
            console.log(err);
        }
    }

    //add multiple in-app notifiction
    async addInAppNotificationMultiple(array) {
        try {
            await notifications.insertMany(array);
        } catch (err) {
            console.log("error in insertion of notification");
            console.log(err);
        }
    }
}

module.exports = Notification;