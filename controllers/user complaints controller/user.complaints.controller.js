import companyAdminSchema from "../../schema/company.admin.schema.js";
import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";
import complaintTimelineSchema from "../../schema/complaint.timeline.schema.js";
import notificationSchema from "../../schema/notification.schema.js";
import { io } from "../../sockets/socketsSetup.js";
import { createNotifications } from "../../utils/createNotifications.js";
import { createTimelineEntry } from "../../utils/createTimelineEntry.js";
import { emitNotifications } from "../../utils/emitNotifications.js";
import { calculateComplaintPriority } from "../../utils/tags.js";

const generateUniqueComplaintId = async (id) => {
  try {
    const complaintCount = await complaintSchema.countDocuments({
      companyId: id,
    });
    const complaintNumber = (complaintCount + 1).toString().padStart(3, "0");
  
    return `BIG-${complaintNumber}`;
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
      tags,
      department,
      complaintType,
    } = req.body;

    // Input validation
    if (!companyName || !submissionType || !complaintMessage) {
      const error = new Error("Please fill all the required fields");
      error.statusCode = 400; // Bad Request
      throw error;
    }
    const findCompany = await companySchema.findOne({
      companyName: companyName,
    });
    if (!findCompany) {
      const error = new Error("Company not found");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // Validate user authentication
    if (!req.user || !req.user.id) {
      const error = new Error("User authentication required");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    // Validate tags format
    let selectedTags;
    let selectedDepartment;
    try {
      selectedTags = Array.isArray(tags) ? tags : tags.split(",");
      selectedDepartment = Array.isArray(department)
        ? department
        : department.split(",");
    } catch (tagError) {
      const error = new Error("Invalid tags format");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // Generate complaint ID
    let complaintId;
    try {
      complaintId = await generateUniqueComplaintId(findCompany._id);
    } catch (idError) {
      // Re-throw with proper status code
      throw idError;
    }

    // Calculate priority
    let priority;
    try {
      priority = calculateComplaintPriority(selectedTags);
    } catch (priorityError) {
      const error = new Error("Failed to calculate complaint priority");
      error.statusCode = 500; // Internal Server Error
      throw error;
    }

    const files = req.cloudinaryFiles || [];

    const evidence = files.map((file) => ({
      filename: file.originalname,
      path: file.url,
      publicId: file.public_id,
      resourceType: file.resource_type,
      thumbnail: file.thumbnail,
    }));

    const complaintObj = {
      complaintId,
      companyId: findCompany._id,
      companyName,
      submissionType,
      complaintMessage,
      tags: selectedTags,
      status_of_client: "Pending",
      priority,
      evidence,
      department: selectedDepartment,
      complaintType,
      complaintUser: complaintType === "Anonymous" ? undefined : req.user.name,
      complaintUserEmail:
        complaintType === "Anonymous" ? undefined : req.user.email,
      userID: req.user.id,
    };

    // Create and save new complaint
    let newComplaint;
    try {
      newComplaint = new complaintSchema(complaintObj);
 
      await newComplaint.save();
    } catch (dbError) {
     
      const error = new Error("Failed to save complaint to database");
      error.statusCode = 500; // Internal Server Error
      throw error;
    }

    // Create timeline entry
    let newTimeline;
    try {
      newTimeline = await createTimelineEntry(
        newComplaint._id,
        "Pending",
        req.user.id,
        `Complaint created with ID: ${complaintId}`,
        true
      );
    } catch (timelineError) {
      const error = new Error("Failed to create complaint timeline");
      error.statusCode = 500; // Internal Server Error
      throw error;
    }

    // Update complaint with timeline
    try {
      newComplaint.timeline.push(newTimeline._id);
      await newComplaint.save();
    } catch (updateError) {
      const error = new Error("Failed to update complaint timeline");
      error.statusCode = 500; // Internal Server Error
      throw error;
    }

    // Create and emit notifications
    try {
      const notifications = await createNotifications(
        newComplaint,
        "NEW_COMPLAINT",
        `New complaint received with ID: ${newComplaint.complaintId}`,
        req.user.id,
        ["SUB ADMIN"],
        {
          sendToUser: false,
          sendToAdmins: true,
        }
      );
      emitNotifications(notifications);
    } catch (notificationError) {
      // Log notification error but don't fail the request
      console.error("Failed to send notifications:", notificationError.message);
    }

    res.status(201).json({
      success: true,
      message: "Complaint received successfully",
      data: newComplaint,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllUserComplaintsForUser(req, res, next) {
  try {
    // Validate user authentication
    if (!req.user || !req.user.id) {
      const error = new Error("User authentication required");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    let complaints;
    try {
      complaints = await complaintSchema
        .find({ userID: req.user.id })
        .select(
          "_id companyName submissionType complaintMessage tags department status_of_client complaintId createdAt"
        )
        .sort({ createdAt: -1 });
    } catch (dbError) {
      const error = new Error(
        `Failed to retrieve complaints: ${dbError.message}`
      );
      error.statusCode = 500; // Internal Server Error
      throw error;
    }

    res.status(200).json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    // Ensure all errors have proper status codes
    if (!error.statusCode) {
      error.statusCode = 500; // Default to Internal Server Error
    }

    console.error(`Get User Complaints Error: ${error.message}`, {
      user: req.user?.id,
      errorStack: error.stack,
    });

    next(error);
  }
}

export async function particular_Complaint_For_User(req, res, next) {
  try {
    // Validate user authentication
    if (!req.user || !req.user.id) {
      const error = new Error("User authentication required");
      error.statusCode = 401; // Unauthorized
      throw error;
    }

    // Validate complaint ID parameter
    if (!req.params.id) {
      const error = new Error("Complaint ID is required");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    // Validate MongoDB ObjectId format
    const mongoose = await import("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      const error = new Error("Invalid complaint ID format");
      error.statusCode = 400; // Bad Request
      throw error;
    }

    let complaint;
    try {
      complaint = await complaintSchema
        .findOne({
          _id: req.params.id,
          userID: req.user.id,
        })
        .populate([
          {
            path: "timeline",
            select:
              "status_of_client changedBy timestamp message visibleToUser",
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
        .select("-__v");
    } catch (dbError) {
      const error = new Error(`Database query failed: ${dbError.message}`);
      error.statusCode = 500; // Internal Server Error
      throw error;
    }

    if (!complaint) {
      const error = new Error("Complaint not found or access denied");
      error.statusCode = 404; // Not Found
      throw error;
    }

    // Safely extract unseen message count
    let unseenMessageCount = 0;
    try {
      unseenMessageCount = complaint.chats?.unseenCounts?.[req.user.role] || 0;
    } catch (countError) {
      // Log but don't fail the request
      console.warn("Failed to get unseen message count:", countError.message);
    }

    res.status(200).json({
      success: true,
      data: {
        complaint,
        unread: unseenMessageCount,
      },
    });
  } catch (error) {
    // Ensure all errors have proper status codes
    if (!error.statusCode) {
      error.statusCode = 500; // Default to Internal Server Error
    }

    console.error(`Get Particular Complaint Error: ${error.message}`, {
      user: req.user?.id,
      complaintId: req.params?.id,
      errorStack: error.stack,
    });

    next(error);
  }
}
