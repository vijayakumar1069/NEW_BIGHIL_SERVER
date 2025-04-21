import companyAdminSchema from "../../schema/company.admin.schema.js";
import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";
import complaintTimelineSchema from "../../schema/complaint.timeline.schema.js";
import notificationSchema from "../../schema/notification.schema.js";
import { io } from "../../sockets/socketsSetup.js";
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
    const { companyName, complaintAgainst, complaintMessage, tags } = req.body;

    if (!companyName || !complaintAgainst || !complaintMessage) {
      const error = new Error("Required fields are missing");
      error.statusCode = 400;
      throw error;
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
      complaintAgainst,
      complaintMessage,
      tags: selectedTags,
      status_of_client: "Pending",
      priority,
      evidence,

      userID: req.user.id,
    };

    const newComplaint = new complaintSchema(complaintObj);
    await newComplaint.save();
    const newTimeLineObj = {
      complaintId: newComplaint._id,
      status_of_client: "Pending",
      changedBy: req.user.id,
      timestamp: new Date(), // Use new Date() for a proper Date object
      message: `Complaint created with ID: ${complaintId}`,
    };
    const newTime = await complaintTimelineSchema.create(newTimeLineObj);

    newComplaint.timeline.push(newTime._id);
    await newComplaint.save(); // Update the complaint with the new timeline entry ID
    const getCompany = await companySchema.findOne({
      companyName: companyName,
    });
    const gettingCompanyAdmins = await companyAdminSchema.find({
      companyId: getCompany._id,
    });
    const admins = gettingCompanyAdmins.map((admin) => admin._id.toString());

    const recipientsObject = admins.map((admin) => ({
      user: admin,
      model: "companyAdmin",
    }));

    //add notifications to the admins
    const newNotifications = await notificationSchema({
      complaintId: newComplaint._id,
      type: "NEW_COMPLAINT",
      message: `New Complaint Added: ${newComplaint.complaintId}`,
      sender: req.user.id,
      senderModel: "USER",
      recipients: recipientsObject,
    });
    await newNotifications.save();
    // emits notifications for admins

    admins.forEach((admin) => {
      const adminRoom = `admin_${admin}`;

      io.to(adminRoom).emit("fetch_admin_notifications", newNotifications);
    });

    // req.io
    //   .to(`user_${complaint.userID}`)
    //   .emit("fetch_user_notifications", newNotification);

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

    next(error); // Pass to error handling
  }
}

export async function getAllUserComplaintsForUser(req, res, next) {
  try {
    const complaints = await complaintSchema
      .find({ userID: req.user.id })
      .select(
        "_id companyName complaintAgainst complaintMessage tags status_of_client complaintId createdAt"
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
          select: "status_of_client changedBy timestamp message",
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
