import companyAdminSchema from "../../schema/company.admin.schema.js";
import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";
import Note from "../../schema/notes.schema.js";
import timeLineModel from "../../schema/complaint.timeline.schema.js";
import resolution from "../../schema/actionTaken.schema.js";
import notificationSchema from "../../schema/notification.schema.js";
import { io } from "../../sockets/socketsSetup.js";
import { complaint_Status_Change_email } from "../../utils/complaint_Status_Change_email.js";
import userSchema from "../../schema/user.schema.js";
export async function getAllComplaintsCurrentForClient(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const { id } = req.user;

    const currentAdminCompany = await companyAdminSchema.findById(id);

    const currentCompany = await companySchema.findById(
      currentAdminCompany.companyId
    );

    // Create base query
    const query = { companyName: currentCompany.companyName };

    // Get total document count
    const total = await complaintSchema.countDocuments(query);

    // Calculate total pages and validate requested page
    const totalPages = Math.ceil(total / limit);
    if (page > totalPages && totalPages > 0) {
      return res.status(400).json({
        success: false,
        error: `Page ${page} does not exist. Max page: ${totalPages}`,
      });
    }

    // Improved pagination performance using skip/limit
    const complaints = await complaintSchema
      .find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-__v") // Exclude version key
      .lean();
    let returnData = {
      total,
      complaints,
      currentPage: page,
      limit,
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

export async function getParticularComplaintForClient(req, res, next) {
  try {
    const { complaintId } = req.params;
    const { id } = req.user;

    const currentAdminCompany = await companyAdminSchema.findById(id);

    const currentCompany = await companySchema.findById(
      currentAdminCompany.companyId
    );

    const complaint = await complaintSchema
      .findOne({ _id: complaintId, companyName: currentCompany.companyName })
      .populate([
        {
          path: "notes", // Populate notes
          select: "complaintNote addedBy createdAt",
          options: { sort: { createdAt: -1 } }, // Sort by createdAt (descending order)
        },
        {
          path: "timeline", // Populate timeline
          select: "status_of_client changedBy timestamp message",
          options: { sort: { timestamp: -1 } }, // Sort timeline events by timestamp (descending)
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

    const roleMap = {
      user: "user",
      "SUB ADMIN": "subadmin",
      "SUPER ADMIN": "superadmin",
      ADMIN: "admin",
    };
    const unseenMessageCount =
      complaint.chats?.unseenCounts[roleMap[req.user.role]];

    if (!complaint) {
      const error = new Error("Complaint not found");
      error.statusCode = 404;
      throw error;
    }

    return res.status(200).json({
      data: {
        complaint,
        unread: unseenMessageCount,
      },
      success: true,
      message: "Fetched complaint successfully",
    });
  } catch (error) {
    next(error);
  }
}

// Updated AddNoteToComplaint function
export async function AddNoteToComplaint(req, res, next) {
  try {
    const { complaintId } = req.params;
    const { note } = req.body;

    // Create a new note object
    const newNoteObj = {
      complaintId: complaintId,
      complaintNote: note,
      addedBy: req.user.role,
    };

    const newNote = await Note.create(newNoteObj);

    // Push the new note's ID into the complaint's notes array
    const complaint = await complaintSchema
      .findByIdAndUpdate(
        complaintId,
        { $push: { notes: newNote._id } },
        { new: true }
      )
      .populate("notes");

    if (!complaint) {
      const error = new Error("Complaint not found");
      error.statusCode = 404;
      throw error;
    }

    // Get the latest note that was just added
    const latestNote = complaint.notes.find(
      (n) => n._id.toString() === newNote._id.toString()
    );

    // Find company by complaint's companyName, then get all company admins
    const findingCompanyId = await companySchema.find({
      companyName: complaint.companyName,
    });
    const findingAdmins = await companyAdminSchema.find({
      companyId: findingCompanyId[0]._id,
    });

    // Filter out the admin who added the note so they don't receive a notification for their own note
    const remainingAdmins = findingAdmins.filter(
      (admin) => admin._id.toString() !== req.user.id.toString()
    );

    // Create a new notification document (if needed)
    const newNotification = new notificationSchema({
      complaintId: complaintId,
      type: "NOTE_ADDED",
      sender: req.user.id,
      senderModel: "companyAdmin",
      recipients: remainingAdmins.map((admin) => ({
        user: admin._id,
        model: "companyAdmin",
      })),
      message: `New note added to complaint ${complaint.complaintId}`,
    });

    await newNotification.save();

    // Emit the new note to the complaint room
    io.to(`complaint_${complaintId}`).emit("fetch_admin_notes", newNote);

    // Also emit to each individual admin room
    remainingAdmins.forEach((admin) => {
      io.to(`admin_${admin._id?.toString()}`).emit(
        "fetch_admin_notes",
        newNote
      );
      io.to(`admin_${admin._id?.toString()}`).emit(
        "fetch_admin_notifications",
        newNotification
      );
    });

    res.status(201).json({
      success: true,
      message: "Note added successfully",
      data: latestNote,
    });
  } catch (error) {
    next(error);
  }
}

export async function ComplaintStatusUpdate(req, res, next) {
  try {
    const { complaintId } = req.params;
    const { status } = req.body;

    const complaint = await complaintSchema.findById(complaintId);
    if (!complaint) {
      const error = new Error("Complaint not found");
      error.statusCode = 404;
      throw error;
    }

    // Update complaint status and save
    complaint.status_of_client = status;
    await complaint.save();

    // Create a new timeline event for the status change
    const newTimeObj = {
      complaintId: complaint._id,
      status_of_client: status,
      changedBy: req.user.id,
      timestamp: Date.now(),
      message: `Status changed to ${status}`,
    };
    const newLineTime = await timeLineModel.create(newTimeObj);
    complaint.timeline.push(newLineTime._id);
    await complaint.save();

    // Create and save notification for the user
    const userNotification = new notificationSchema({
      complaintId: complaintId,
      type: "STATUS_CHANGE",
      sender: req.user.id,
      senderModel: "companyAdmin",
      message: `Complaint status updated to ${status} for ${complaint.complaintId}`,
      recipients: [
        {
          user: complaint.userID,
          model: "USER",
        },
      ],
    });
    await userNotification.save();

    // Retrieve the company record and the company admins
    const companyRecord = await companySchema.findOne({
      companyName: complaint.companyName,
    });
    if (!companyRecord) {
      console.warn("No company record found for", complaint.companyName);
    }
    const companyAdmins = await companyAdminSchema.find({
      companyId: companyRecord._id,
    });

    // Filter out the admin who made the change
    const currentAdminId = req.user.id.toString();
    const remainingAdminIds = companyAdmins
      .map((admin) => admin._id.toString())
      .filter((adminId) => adminId !== currentAdminId);

    // For each remaining admin, create and save a notification document
    for (const adminId of remainingAdminIds) {
      const adminNotification = new notificationSchema({
        complaintId: complaintId,
        type: "STATUS_CHANGE",
        sender: req.user.id,
        senderModel: "companyAdmin",
        message: `Complaint status updated to ${status} for ${complaint.complaintId}`,
        recipients: [
          {
            user: adminId,
            model: "companyAdmin",
          },
        ],
      });
      await adminNotification.save();

      // Emit a socket event for the admin notification (if desired)
      io.to(`admin_${adminId}`).emit(
        "fetch_admin_notifications",
        adminNotification
      );
    }

    // Emit status change to correct room format
    io.to(`complaint_${complaintId}`).emit("status_change", {
      status_of_client: status,
      timelineEvent: newLineTime,
    });

    const currentUserID = complaint.userID.toString();
    // Emit the notification to the user as well
    io.to(`user_${currentUserID}`).emit(
      "fetch_user_notifications",
      userNotification
    );

    const complaintUser = await userSchema.findById(currentUserID);
    const userName = complaintUser.name;

    const sendStatusUpdateEmail = await complaint_Status_Change_email({
      email: req.user.email,
      userName: userName,
      complaintId: complaintId,
      complaintStatus: status,
    });

    if (sendStatusUpdateEmail.success !== true) {
      throw new Error("Email not sent");
    }

    res.status(200).json({
      success: true,
      message: "Complaint status updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function CloseTheComplaint(req, res, next) {
  const { complaintId } = req.params;
  const { resolutionNote, acknowledgements } = req.body;
  try {
    const newActionObj = {
      complaintId: complaintId, // Ensure the field name is correct
      resolutionNote: resolutionNote,
      acknowledgements: acknowledgements,
      addedBy: req.user.role,
    };

    // Create the resolution (action) document
    const newAction = await resolution.create(newActionObj);

    // Prepare the timeline object
    const newTimelineObj = {
      complaintId: complaintId,
      status_of_client: "Resolved",
      changedBy: req.user.id,
      timestamp: new Date(), // Use new Date() for a proper Date object
      message: `Complaint resolved by ${req.user.role}`,
    };

    // Save the timeline document so that it gets an _id
    const newTimelineDoc = await timeLineModel.create(newTimelineObj);

    io.to(`complaint_${complaintId}`).emit("close_complaint", {
      resolutionNote,
      acknowledgements,
      timelineEvent: newTimelineDoc,
    });

    // Update the complaint: Combine $set into one object and push the timeline _id
    const updatedComplaint = await complaintSchema.findByIdAndUpdate(
      complaintId,
      {
        $set: {
          status_of_client: "Resolved",
          actionMessage: newAction._id,
        },
        $push: { timeline: newTimelineDoc._id },
      },
      {
        new: true, // Return the updated document
      }
    );
    const gettingUserId = await complaintSchema.findOne({
      _id: complaintId,
    });
    const newNotification = await notificationSchema({
      complaintId: complaintId,
      type: "RESOLUTION_ADDED",
      sender: req.user.id,
      senderModel: "companyAdmin",
      message: `Complaint status updated to ${updatedComplaint.status_of_client} for ${updatedComplaint.complaintId}`,
      recipients: [
        {
          user: gettingUserId.userID,
          model: "USER",
        },
      ],
    });
    // Emit the new notification to the user as well
    await newNotification.save();
    io.to(`user_${gettingUserId.userID}`).emit(
      "fetch_user_notifications",
      newNotification
    );

    // Retrieve the company record and the company admins
    const companyRecord = await companySchema.findOne({
      companyName: updatedComplaint.companyName,
    });
    if (!companyRecord) {
      console.warn("No company record found for", updatedComplaint.companyName);
    }
    const companyAdmins = await companyAdminSchema.find({
      companyId: companyRecord._id,
    });
    const currentAdminId = req.user.id.toString();
    const remainingAdminIds = companyAdmins
      .map((admin) => admin._id.toString())
      .filter((adminId) => adminId !== currentAdminId);

    for (const adminId of remainingAdminIds) {
      const adminNotification = new notificationSchema({
        complaintId: complaintId,
        type: "RESOLUTION_ADDED",
        sender: req.user.id,
        senderModel: "companyAdmin",
        message: `Complaint status updated to ${updatedComplaint.status_of_client} for ${updatedComplaint.complaintId}`,
        recipients: [
          {
            user: adminId,
            model: "companyAdmin",
          },
        ],
      });
      await adminNotification.save();

      // Emit a socket event for the admin notification (if desired)
      io.to(`admin_${adminId}`).emit(
        "fetch_admin_notifications",
        adminNotification
      );
    }

    res.status(200).json({
      success: true,
      message: "Complaint closed successfully",
      data: { newTimelineDoc }, // Return the newly created timeline document
    });
  } catch (error) {
    next(error);
  }
}
