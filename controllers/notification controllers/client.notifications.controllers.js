import notificationSchema from "../../schema/notification.schema.js";

// Add this controller
export async function getUnreadCount(req, res, next) {
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
export async function getClientNotifications(req, res, next) {
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
export async function deleteClientNotification(req, res, next) {
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

export async function clientNotificationMarkAsRead(req, res, next) {
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

    // Find the recipient entry for the current user
    const recipientEntry = notification.recipients.find(
      (recipient) => recipient.user.toString() === req.user.id.toString()
    );

    if (!recipientEntry) {
      const error = new Error("User is not a recipient of this notification");
      error.statusCode = 403;
      return next(error);
    }

    // Check if it is already read
    if (recipientEntry.read) {
      return res.status(200).json({
        success: false,
        message: "Notification has already been marked as read",
      });
    }

    // Otherwise, mark as read
    recipientEntry.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read successfully",
    });
  } catch (error) {
    next(error);
  }
}
