import notificationSchema from "../../schema/notification.schema.js";

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
    const totalPages = Math.ceil(total / limit);
    const returnData = {
      total,
      notifications,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
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
  const { id } = req.body; // expect both notification id and the recipient user id

  if (!id || !req.user.id) {
    const error = new Error("Notification ID and userId are required");
    error.statusCode = 400;
    return next(error);
  }

  try {
    // Remove the recipient with the matching userId
    const notification = await notificationSchema.findByIdAndUpdate(
      id,
      { $pull: { recipients: { user: req.user.id } } },
      { new: true }
    );

    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      return next(error);
    }

    // Optionally, if you want to delete the notification entirely if no recipients remain:
    if (notification.recipients.length === 0) {
      await notificationSchema.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: "Notification deleted as no recipients remain",
      });
    }

    res.status(200).json({
      success: true,
      message: "Recipient removed from notification successfully",
      notification,
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
