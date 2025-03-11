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
export async function deleteUserNotification(req, res, next) {
  const { id } = req.body;
  if (!id) {
    const error = new Error("Notification ID is required");
    error.statusCode = 400;
    return next(error);
  }

  try {
    const notification = await notificationSchema.findByIdAndDelete(id);
    if (!notification) {
      const error = new Error("Notification not found");
      error.statusCode = 404;
      return next(error);
    }
    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
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
