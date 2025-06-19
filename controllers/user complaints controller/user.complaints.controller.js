import companyAdminSchema from "../../schema/company.admin.schema.js";
import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";

import { createNotifications } from "../../utils/createNotifications.js";
import { createTimelineEntry } from "../../utils/createTimelineEntry.js";
import { emitNotifications } from "../../utils/emitNotifications.js";
import { calculateComplaintPriority } from "../../utils/tags.js";
import { getImagePath } from "../../utils/getImagePath.js";
import { getBaseClientUrl } from "../../utils/getBaseClientUrl.js";
import {
  complaintAddedEmail,
  complaintReceivedEmail,
} from "../../utils/send_welcome_email.js";
import mongoose from "mongoose";
import { validateAndNormalizeEmail } from "../../utils/validateAndNormalizeEmail.js";

const generateUniqueComplaintId = async (companyName, companyId) => {
  try {
    const complaintCount = await complaintSchema.countDocuments({
      companyId: companyId,
    });
    const complaintNumber = (complaintCount + 1).toString().padStart(3, "0");

    return `${companyName.toUpperCase().substring(0, 3)}-${complaintNumber}`;
  } catch (error) {
    const dbError = new Error(
      `Failed to generate complaint ID: ${error.message}`
    );
    dbError.statusCode = 500; // Internal Server Error
    throw dbError;
  }
};

export async function userAddComplaint(req, res, next) {
  try {
    const {
      companyName,
      submissionType,
      complaintMessage,
      tags = [],
      department = [],
      complaintType,
    } = req.body;

    if (!companyName || !submissionType || !complaintMessage) {
      const error = new Error("Please fill all the required fields");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    const findCompany = await companySchema.findOne({ companyName });
    if (!findCompany) {
      const error = new Error("Company not found");
      error.statusCode = 404; // Not Found
      throw error;
    }

    if (!req.user?.id) {
      const error = new Error("User authentication required");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    // Generate complaint ID
    const complaintId = await generateUniqueComplaintId(
      companyName,
      findCompany._id
    );

    const files = req.cloudinaryFiles || [];
    const evidence = files.map((file) => ({
      filename: file.originalname,
      path: file.url,
      publicId: file.public_id,
      resourceType: file.resource_type,
      thumbnail: file.thumbnail,
    }));

    const complaintObjectId = new mongoose.Types.ObjectId(); // Used for redirects before saving

    const logoPath = getImagePath();
    const supportEmail = process.env.SUPPORT_EMAIL;

    const clientRedirectLink = `${getBaseClientUrl()}/client/client-complaints/${complaintObjectId}`;
    const userRedirectLink = `${getBaseClientUrl()}/user/my-complaints/${complaintObjectId}`;

    // 📧 Prepare emails
    const emailJobs = [];

    // Send to user
    const userEmail = validateAndNormalizeEmail(req.user.email);
    if (!userEmail) {
      const error = new Error("Invalid email format");
      error.statusCode = 400; // Bad Request
      throw error;
    }
    emailJobs.push(
      complaintAddedEmail({
        userName: req.user.name,
        email: userEmail,
        complaintId,
        logoPath,
        redirectLink: userRedirectLink,
        supportEmail,
        subject: "Complaint Added Successfully",
      })
    );

    // Send to relevant admins (skip ADMIN)
    const companyAdmins = await companyAdminSchema
      .find({ companyId: findCompany._id })
      .select("role email");

    for (const admin of companyAdmins) {
      if (admin.role === "ADMIN") continue;
      const adminEmail = validateAndNormalizeEmail(admin.email);

      emailJobs.push(
        complaintReceivedEmail({
          role: admin.role,
          email: adminEmail,
          complaintId,
          logoPath,
          redirectLink: clientRedirectLink,
          supportEmail,
          subject: "New Complaint Received",
        })
      );
    }

    // ⏳ Send all emails in parallel
    const emailResults = await Promise.all(emailJobs);
    const anyFailed = emailResults.some((res) => !res.success);
    if (anyFailed) {
      const error = new Error("Email delivery failed. Complaint not saved.");
      error.statusCode = 500;
      throw error;
    }

    // ✅ All emails succeeded — create complaint
    const complaintDoc = new complaintSchema({
      _id: complaintObjectId, // Set the pre-generated ID
      complaintId,
      companyId: findCompany._id,
      companyName,
      submissionType,
      complaintMessage,
      tags: tags,
      department: department,
      status_of_client: "Pending",
      priority: calculateComplaintPriority(tags),
      evidence,
      complaintType,
      complaintUser: complaintType === "Anonymous" ? undefined : req.user.name,
      complaintUserEmail: complaintType === "Anonymous" ? undefined : userEmail,
      userID: req.user.id,
    });

    await complaintDoc.save();

    // Timeline
    const timelineEntry = await createTimelineEntry(
      complaintObjectId,
      "Pending",
      req.user.id,
      `Complaint created with ID: ${complaintId}`,
      true
    );

    complaintDoc.timeline.push(timelineEntry._id);
    await complaintDoc.save();

    // Emit notifications (SUB ADMIN only)
    const notifications = await createNotifications(
      complaintDoc,
      "NEW_COMPLAINT",
      `New complaint received with ID: ${complaintId}`,
      req.user.id,
      ["SUB ADMIN"],
      {
        sendToUser: false,
        sendToAdmins: true,
      }
    );
    emitNotifications(notifications);

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully.",
      data: complaintDoc,
    });
  } catch (error) {
    console.error("Error in userAddComplaint:", error.message);
    next(error);
  }
}

export async function getAllUserComplaintsForUser(req, res, next) {
  try {
    const userId = req.user?.id;

    // 1. Check authentication
    if (!userId) {
      const error = new Error("User authentication required");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    // 2. Fetch user complaints (lean for performance)
    const complaints = await complaintSchema
      .find({ userID: userId })
      .select(
        "_id companyName submissionType complaintMessage tags department status_of_client complaintId createdAt"
      )
      .sort({ createdAt: -1 })
      .lean(); // <-- improves performance (no Mongoose document overhead)

    // 3. Return response
    return res.status(200).json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    console.error(`Get User Complaints Error: ${error.message}`, {
      user: req.user?.id,
      stack: error.stack,
    });
    next(error);
  }
}

export async function particular_Complaint_For_User(req, res, next) {
  try {
    const userId = req.user?.id;
    const complaintId = req.params?.id;

    // 1. Auth and input validation
    if (!userId) {
      const error = new Error("User authentication required");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    if (!complaintId || !mongoose.Types.ObjectId.isValid(complaintId)) {
      const error = new Error("Invalid or missing complaint ID");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // 2. Fetch complaint with only necessary fields using lean()
    const complaint = await complaintSchema
      .findOne({ _id: complaintId, userID: userId })
      .populate([
        {
          path: "timeline",
          select: "status_of_client changedBy timestamp message visibleToUser",
          options: { sort: { timestamp: -1 } },
        },
        {
          path: "actionMessage",
          select: "resolutionNote acknowledgements",
        },
        {
          path: "chats",
          select: "unseenCounts",
        },
      ])
      .select("-__v")
      .lean(); // Improves performance

    if (!complaint) {
      const error = new Error("Complaint not found or access denied");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // 3. Extract unseen message count safely
    const unseenMessageCount =
      complaint?.chats?.unseenCounts?.[req.user.role] || 0;

    return res.status(200).json({
      success: true,
      data: {
        complaint,
        unread: unseenMessageCount,
      },
    });
  } catch (error) {
    console.error("Get Particular Complaint Error", {
      message: error.message,
      user: req.user?.id,
      complaintId: req.params?.id,
      stack: error.stack,
    });
    next(error);
  }
}
