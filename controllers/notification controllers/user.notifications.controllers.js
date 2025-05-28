import notificationSchema from "../../schema/notification.schema.js";

export async function getUserNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default limit 10
    const skip = (page - 1) * limit;

    // Fetch notifications with pagination
    const notifications = await notificationSchema
      .find({ "recipients.user": userId })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);
    const total = await notificationSchema.countDocuments({
      "recipients.user": userId,
    });
    const totalUnread = await notificationSchema.countDocuments({
      "recipients.user": userId,
      recipients: {
        $elemMatch: {
          user: userId,
          read: false,
        },
      },
    });
    const totalPages = Math.ceil(total / limit);
    const returnData = {
      total,
      notifications,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      totalUnread,
    };
    res.status(200).json({
      success: true,
      message: "Fetched complaints successfully",
      data: returnData,
    });
  } catch (error) {
    next(error);
  }
}
export async function deleteUserNotification(req, res, next) {
  const { id } = req.body;
  const userId = req.user.id;
  if (!id || !userId) {
    const error = new Error("Notification ID and userId are required");
    error.statusCode = 400;
    return next(error);
  }

  try {
    // First check if notification exists and user is a recipient
    const existingNotification = await notificationSchema.findOne({
      _id: id,
      "recipients.user": userId,
    });

    if (!existingNotification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied",
      });
    }

    // Update the notification
    const notification = await notificationSchema.findByIdAndUpdate(
      id,
      { $pull: { recipients: { user: userId } } },
      { new: true }
    );

    // Delete notification if no recipients left
    if (notification.recipients.length === 0) {
      await notificationSchema.findByIdAndDelete(id);
    }

    // Get updated count
    const total = await notificationSchema.countDocuments({
      "recipients.user": userId,
    });

    res.status(200).json({
      success: true,
      message: "Notification removed successfully",
      data: { total },
    });
  } catch (error) {
    next(error);
  }
}

export async function userNotificationMarkAsRead(req, res, next) {
  const { notificationId } = req.body;
  if (!notificationId) {
    const error = new Error("Notification notificationId is required");
    error.statusCode = 400;
    return next(error);
  }

  try {
    const notification = await notificationSchema.findById(notificationId);

    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      return next(error);
    }
    notification.recipients.map((recipient) => {
      if (recipient.user.toString() === req.user.id.toString()) {
        recipient.read = true;
      }
      return recipient;
    });
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCountForUser(req, res, next) {
  try {
    const userId = req.user.id;

    const count = await notificationSchema.countDocuments({
      "recipients.user": userId,
      recipients: {
        $elemMatch: {
          user: userId,
          read: false,
        },
      },
    });

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
}
export async function userMarkAllNotificationsAsRead(req, res, next) {
  const userId = req.user.id;

  if (!userId) {
    const error = new Error("User ID is required");
    error.statusCode = 400;
    return next(error);
  }

  try {
    const result = await notificationSchema.updateMany(
      {
        "recipients.user": userId,
        "recipients.read": false
      },
      {
        $set: {
          "recipients.$.read": true,
          "recipients.$.readAt": new Date()
        }
      }
    );

    const totalUnread = await notificationSchema.countDocuments({
      "recipients.user": userId,
      "recipients.read": false
    });

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: {
        modifiedCount: result.modifiedCount,
        totalUnread: totalUnread
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function userDeleteAllNotifications(req, res, next) {
  const userId = req.user.id;

  if (!userId) {
    const error = new Error("User ID is required");
    error.statusCode = 400;
    return next(error);
  }

  try {
    const notifications = await notificationSchema.find({
      "recipients.user": userId
    });

    let deletedCount = 0;
    let removedCount = 0;

    for (const notification of notifications) {
      const updatedNotification = await notificationSchema.findByIdAndUpdate(
        notification._id,
        { $pull: { recipients: { user: userId } } },
        { new: true }
      );

      removedCount++;

      if (updatedNotification && updatedNotification.recipients.length === 0) {
        await notificationSchema.findByIdAndDelete(notification._id);
        deletedCount++;
      }
    }

    const total = await notificationSchema.countDocuments({
      "recipients.user": userId
    });

    res.status(200).json({
      success: true,
      message: `${removedCount} notifications removed successfully`,
      data: {
        removedCount,
        deletedCount,
        total
      }
    });
  } catch (error) {
    next(error);
  }
}