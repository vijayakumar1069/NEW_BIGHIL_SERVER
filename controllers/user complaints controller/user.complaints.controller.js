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

const generateUniqueComplaintId = async () => {
  try {
    const complaintCount = await complaintSchema.countDocuments();
    const complaintNumber = (complaintCount + 1).toString().padStart(3, "0");
    return `BIG-${complaintNumber}`;
  } catch (error) {
    error.message = `Failed to generate complaint ID: ${error.message}`;
    throw error;
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

    if (!companyName || !submissionType || !complaintMessage) {
      throw new Error("Please fill all the required fields");
    }

    const selectedTags = Array.isArray(tags) ? tags : tags.split(",");
    const complaintId = await generateUniqueComplaintId();
    const priority = calculateComplaintPriority(selectedTags);
    const files = req.cloudinaryFiles || [];

    const evidence = files.map((file) => ({
      filename: file.originalname,
      path: file.url,
    }));

    const complaintObj = {
      complaintId,
      companyName,
      submissionType,
      complaintMessage,
      tags: selectedTags,
      status_of_client: "Pending",
      priority,
      evidence,
      department,
      complaintType,
      complaintUser: complaintType === "Anonymous" ? undefined : req.user.name,
      complaintUserEmail:
        complaintType === "Anonymous" ? undefined : req.user.email,
      userID: req.user.id,
    };

    const newComplaint = new complaintSchema(complaintObj);
    await newComplaint.save();

    const newTimeline = await createTimelineEntry(
      newComplaint._id,
      "Pending",
      req.user.id,
      `Complaint created with ID: ${complaintId}`,
      true
    );

    newComplaint.timeline.push(newTimeline._id);
    await newComplaint.save();

    // Create notifications
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

    res.status(201).json({
      success: true,
      message: "Complaint received successfully",
      data: newComplaint,
    });
  } catch (error) {
    // Handle specific error cases
    if (error.name === "ValidationError") {
      error.statusCode = 400;
      error.message = `Invalid data format: ${error.message}`;
    }

    if (!error.statusCode) error.statusCode = 500;

    console.error(`Add Complaint Error: ${error.message}`, {
      user: req.user?.id,
      errorStack: error.stack,
    });

    next(error);
  }
}

export async function getAllUserComplaintsForUser(req, res, next) {
  try {
    const complaints = await complaintSchema
      .find({ userID: req.user.id })
      .select(
        "_id companyName  submissionType complaintMessage tags department status_of_client complaintId createdAt"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: complaints,
    });
  } catch (error) {
    error.message = `Failed to retrieve complaints for user: ${error.message}`;
    error.statusCode = 500;

    next(error); // Pass to error handling middleware
  }
}

export async function particular_Complaint_For_User(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const complaint = await complaintSchema
      .findOne({
        _id: req.params.id,
        userID: req.user.id,
      })
      .populate([
        {
          path: "timeline",
          select: "status_of_client changedBy timestamp message visibleToUser",
          options: { sort: { timestamp: -1 } },
        },
        {
          path: "actionMessage", // Populate resolution
          select: "resolutionNote acknowledgements",
        },
        {
          path: "chats", // Populate chats
          select: "unseenCounts",
        },
      ])
      .select("-__v"); // Exclude MongoDB internal version key

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const unseenMessageCount = complaint.chats?.unseenCounts[req.user.role];

    res.status(200).json({
      success: true,
      data: {
        complaint,
        unread: unseenMessageCount,
      },
    });
  } catch (error) {
    console.error("Error fetching complaint:", error); // Log the actual error
    next(error); // Pass error to the error handling middleware
  }
}
