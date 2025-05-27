import companyAdminSchema from "../schema/company.admin.schema.js";
import companySchema from "../schema/company.schema.js";
import notificationSchema from "../schema/notification.schema.js";

export async function createNotifications(
  complaint,
  type,
  message,
  sender,
  additionalRecipients = [],
  { sendToUser = true, sendToAdmins = true } = {}
) {
  const notifications = [];

  // ✅ Send to user
  if (sendToUser) {
    const userNotification = new notificationSchema({
      complaintId: complaint._id,
      type,
      sender,
      senderModel: "companyAdmin",
      message,
      recipients: [{ user: complaint.userID, model: "USER" }],
    });
    await userNotification.save();
    notifications.push({
      notification: userNotification,
      userId: complaint.userID.toString(),
    });
  }

  // ✅ Send to admins
  if (sendToAdmins) {
    const companyRecord = await companySchema.findOne({
      companyName: complaint.companyName,
    });

    if (companyRecord) {
      const admins = await companyAdminSchema.find({
        companyId: companyRecord._id,
        role: { $in: additionalRecipients },
      });

      for (const admin of admins) {
        if (admin._id.toString() !== sender.toString()) {
          const adminNotification = new notificationSchema({
            complaintId: complaint._id,
            type,
            sender,
            senderModel: "companyAdmin",
            message,
            recipients: [{ user: admin._id, model: "companyAdmin" }],
          });
          await adminNotification.save();
          notifications.push({
            notification: adminNotification,
            adminId: admin._id.toString(),
          });
        }
      }
    }
  }

  return notifications;
}
