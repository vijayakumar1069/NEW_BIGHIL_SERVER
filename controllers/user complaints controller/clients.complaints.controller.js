import companyAdminSchema from "../../schema/company.admin.schema.js";
import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";
import Note from "../../schema/notes.schema.js";
import timeLineModel from "../../schema/complaint.timeline.schema.js";
import resolution from "../../schema/actionTaken.schema.js";
import notificationSchema from "../../schema/notification.schema.js";
import { io } from "../../sockets/socketsSetup.js";
import { complaint_Status_Change_email } from "../../utils/complaint_Status_Change_email.js";
import { complaintResolvedEmail } from "../../utils/complaintResolvedEmail.js";
import userSchema from "../../schema/user.schema.js";
import { getBaseClientUrl } from "../../utils/getBaseClientUrl.js";
import { getImagePath } from "../../utils/getImagePath.js";
import { createTimelineEntry } from "../../utils/createTimelineEntry.js";
import { createNotifications } from "../../utils/createNotifications.js";
import { emitNotifications } from "../../utils/emitNotifications.js";
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
          select: "status_of_client changedBy timestamp message visibleToUser",
          options: { sort: { timestamp: -1 } }, // Sort timeline events by timestamp (descending)
        },
        {
          path: "actionMessage", // Populate resolution
          select: "resolutionNote acknowledgements",
          options: { sort: { createdAt: -1 } },
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
      throw new Error("Complaint not found");
    }

    // Get the latest note that was just added
    const latestNote = complaint.notes.find(
      (n) => n._id.toString() === newNote._id.toString()
    );
    const notifications = await createNotifications(
      complaint,
      "NOTE_ADDED",
      `New note added to complaint ${complaint.complaintId}`,
      req.user.id,
      ["SUB ADMIN", "SUPER ADMIN"],
      {
        sendToUser: false,
        sendToAdmins: true,
      }
    );
    emitNotifications(notifications);

    // // Find company by complaint's companyName, then get all company admins
    // const findingCompanyId = await companySchema.find({
    //   companyName: complaint.companyName,
    // });
    // const findingAdmins = await companyAdminSchema.find({
    //   companyId: findingCompanyId[0]._id,
    // });

    // // Filter out the admin who added the note so they don't receive a notification for their own note
    // const remainingAdmins = findingAdmins.filter(
    //   (admin) => admin._id.toString() !== req.user.id.toString()
    // );

    // // Create a new notification document (if needed)
    // const newNotification = new notificationSchema({
    //   complaintId: complaintId,
    //   type: "NOTE_ADDED",
    //   sender: req.user.id,
    //   senderModel: "companyAdmin",
    //   recipients: remainingAdmins.map((admin) => ({
    //     user: admin._id,
    //     model: "companyAdmin",
    //   })),
    //   message: `New note added to complaint ${complaint.complaintId}`,
    // });

    // await newNotification.save();

    // Emit the new note to the complaint room
    io.to(`complaint_${complaintId}`).emit("fetch_admin_notes", newNote);

    // // Also emit to each individual admin room
    // remainingAdmins.forEach((admin) => {
    //   io.to(`admin_${admin._id?.toString()}`).emit(
    //     "fetch_admin_notes",
    //     newNote
    //   );
    //   io.to(`admin_${admin._id?.toString()}`).emit(
    //     "fetch_admin_notifications",
    //     newNotification
    //   );
    // });

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
    const { status, resolutionNote = "" } = req.body;

    const complaint = await complaintSchema.findById(complaintId);
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    let timelineEntry;
    let notifications = [];

    switch (status) {
      case "In Progress":
        // Simple status update
        complaint.status_of_client = status;
        await complaint.save();

        timelineEntry = await createTimelineEntry(
          complaintId,
          status,
          req.user.id,
          `Complaint status updated to ${status} for ${complaint.complaintId}`,
          true
        );

        notifications = await createNotifications(
          complaint,
          "STATUS_CHANGE",
          `Complaint status updated to ${status} for ${complaint.complaintId}`,
          req.user.id,
          ["SUB ADMIN"],
          {
            sendToUser: true,
            sendToAdmins: true,
          }
        );
        // Send email notification
        const currentUser = await userSchema.findById(complaint.userID);
        const logoPath = getImagePath();
        const redirectLink = `${getBaseClientUrl()}/user/my-complaints/${complaintId}`;

        const emailResult = await complaint_Status_Change_email({
          email: currentUser.email,
          userName: currentUser.name,
          complaintId: complaint.complaintId,
          complaintStatus: complaint.status_of_client,
          logoPath,
          redirectLink,
        });
        console.log("emailResult", emailResult);

        if (!emailResult.success) {
          throw new Error("Email not sent");
        }
        io.to(`complaint_${complaintId}`).emit("status_change", {
          status_of_client: complaint.status_of_client,
          timelineEvent: timelineEntry,
        });
        break;

      case "Unwanted":
        // Create resolution entry with unwanted reason
        const unwantedResolution = await resolution.create({
          complaintId,
          resolutionNote: resolutionNote,
          acknowledgements: "Marked As Unwanted",
          addedBy: req.user.role,
        });

        // Update complaint to pending authorization
        complaint.status_of_client = "Pending Authorization";
        complaint.previous_status_of_client = "Unwanted";
        complaint.authorizationStatus = "Pending";
        complaint.actionMessage.push(unwantedResolution._id);
        await complaint.save();

        timelineEntry = await createTimelineEntry(
          complaintId,
          "Pending Authorization",
          req.user.id,
          `Complaint marked as Unwanted and sent for authorization`,
          false
        );

        // // Notify user and SUB ADMINs about status change
        // notifications = await createNotifications(
        //   complaint,
        //   "STATUS_CHANGE",
        //   `Complaint status updated to Unwanted for ${complaint.complaintId}`,
        //   req.user.id,
        //   ["SUB ADMIN"],
        //   {
        //     sendToUser: false,
        //     sendToAdmins: true,
        //   }
        // );

        // Special notification for SUPER ADMINs about unwanted complaint
        const superAdminNotifications = await createNotifications(
          complaint,
          "UNWANTED_COMPLAINT",
          `Complaint ${complaint.complaintId} marked as Unwanted by ${req.user.role}`,
          req.user.id,
          ["SUPER ADMIN"],
          {
            sendToUser: false,
            sendToAdmins: true,
          }
        );
        const latestActionTken = await resolution
          .findOne({ complaintId })
          .sort({ createdAt: -1 });
        notifications = [...superAdminNotifications];
        io.to(`complaint_${complaintId}`).emit("status_change", {
          status_of_client: complaint.status_of_client,
          timelineEvent: timelineEntry,
          actionMessage: latestActionTken,
        });
        break;

      default:
        throw new Error("Invalid status provided");
    }

    // Emit socket events
    emitNotifications(notifications);

    res.status(200).json({
      success: true,
      message: "Complaint status updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function CloseTheComplaint(req, res, next) {
  try {
    const { complaintId } = req.params;
    const { resolutionNote, acknowledgements } = req.body;
    console.log(resolutionNote, acknowledgements);

    const complaint = await complaintSchema.findById(complaintId);
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    // Create resolution entry
    const resolutionEntry = await resolution.create({
      complaintId,
      resolutionNote,
      acknowledgements,
      addedBy: req.user.role,
    });

    // Update complaint status
    complaint.status_of_client = "Pending Authorization";
    complaint.previous_status_of_client = "Resolved";
    complaint.authorizationStatus = "Pending";
    complaint.actionMessage.push(resolutionEntry._id);
    await complaint.save();

    // Create timeline entry
    const timelineEntry = await createTimelineEntry(
      complaintId,
      "Pending Authorization",
      req.user.id,
      `Complaint resolved and sent for authorization`,
      false
    );

    // Create notifications
    const notifications = await createNotifications(
      complaint,
      "RESOLUTION_ADDED",
      `Complaint resolved and pending authorization for ${complaint.complaintId}`,
      req.user.id,
      ["SUPER ADMIN"],
      {
        sendToUser: false,
        sendToAdmins: true,
      }
    );

    // Emit socket events
    emitNotifications(notifications);

    io.to(`complaint_${complaintId}`).emit("close_complaint", {
      resolutionNote,
      acknowledgements,
      timelineEvent: timelineEntry,
    });

    res.status(200).json({
      success: true,
      message: "Complaint resolved and sent for authorization",
      data: { timelineEntry },
    });
  } catch (error) {
    next(error);
  }
}

export async function complaintAuthorizationStatusUpdate(req, res, next) {
  try {
    const { complaintId } = req.params;
    const { status, rejectionReason = "" } = req.body; // "Approved" or "Rejected"
    console.log(status, rejectionReason);
    const complaint = await complaintSchema
      .findById(complaintId)
      .populate("actionMessage");
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    if (complaint.status_of_client !== "Pending Authorization") {
      throw new Error("This Complaint Is Already Authorized");
    }

    let finalStatus;
    let timelineMessage;
    let notificationType;
    let notificationMessage;
    let timelineEntry;
    let notifications = [];
    let resetStatus = false;

    if (status === "Approved") {
      // Approve the previous action (Resolved or Unwanted)
      finalStatus = complaint.previous_status_of_client;
      complaint.status_of_client = finalStatus;
      complaint.authorizationStatus = "Approved";

      timelineMessage = `Authorization approved: Status finalized as ${finalStatus}`;
      notificationType =
        finalStatus === "Resolved"
          ? "COMPLAINT_RESOLVED"
          : "UNWANTED_COMPLAINT";
      notificationMessage = `Complaint ${complaint.complaintId} has been ${finalStatus.toLowerCase()}`;

      // Create notifications
      notifications = await createNotifications(
        complaint,
        notificationType,
        notificationMessage,
        req.user.id,
        ["SUB ADMIN"],
        {
          sendToUser: true,
          sendToAdmins: true,
        }
      );
      // Send email notification
      const complaintUser = await userSchema.findById(complaint.userID);
      const logoPath = getImagePath();
      const redirectLink = `${getBaseClientUrl()}/user/my-complaints/${complaintId}`;

      const emailResult = await complaintResolvedEmail({
        email: complaintUser.email,
        userName: complaintUser.name,
        complaintId: complaint.complaintId,
        complaintStatus: complaint.status_of_client,
        redirectLink,
        resolutionNote: complaint.actionMessage[0]?.resolutionNote || "",
        acknowledgements: complaint.actionMessage[0]?.acknowledgements || "",
        logoPath,
      });

      if (!emailResult.success) {
        throw new Error("Email not sent");
      }
      // Create timeline entry
      timelineEntry = await createTimelineEntry(
        complaintId,
        finalStatus,
        req.user.id,
        timelineMessage,
        true
      );
    } else if (status === "Rejected") {
      // Reject the action, revert to In Progress
      finalStatus = "In Progress";
      complaint.status_of_client = finalStatus;
      complaint.previous_status_of_client = null;
      complaint.authorizationStatus = "Pending";
      complaint.authoriseRejectionReason.push(rejectionReason);
      resetStatus = true;

      timelineMessage = `Authorization rejected: Status reverted to In Progress`;
      notificationType = "AUTHORIZATION_REJECTED";
      notificationMessage = `Authorization rejected for complaint ${complaint.complaintId}. Status reverted to In Progress`;
      // Create timeline entry
      timelineEntry = await createTimelineEntry(
        complaintId,
        finalStatus,
        req.user.id,
        timelineMessage,
        false
      );
      // Create notifications
      notifications = await createNotifications(
        complaint,
        notificationType,
        notificationMessage,
        req.user.id,
        ["SUB ADMIN"],
        {
          sendToUser: false,
          sendToAdmins: true,
        }
      );
    } else {
      throw new Error("Invalid authorization status");
    }

    await complaint.save();

    // Emit socket events
    emitNotifications(notifications);
    const latestAction = await resolution
      .findOne({ complaintId })
      .sort({ createdAt: -1 });

    // Emit appropriate socket event based on final status
    if (finalStatus === "Resolved" || finalStatus === "Unwanted") {
      console.log(
        "close complaint event called in complaintAuthorizationStatusUpdate"
      );
      io.to(`complaint_${complaintId}`).emit("close_complaint", {
        resolutionNote: latestAction?.resolutionNote || "",
        acknowledgements: latestAction?.acknowledgements || "",
        timelineEvent: timelineEntry,
        status_of_client: finalStatus,
      });
    } else {
      console.log(
        "status change event called in complaintAuthorizationStatusUpdate"
      );
      io.to(`complaint_${complaintId}`).emit("status_change", {
        status_of_client: finalStatus,
        timelineEvent: timelineEntry,
        actionMessage: latestAction,
        rejectionReason: rejectionReason,
        resetActionTakenForm: true,
        changeSuperAdminStatus: "Pending",
      });
      // io.to(`complaint_${complaintId}`).emit("close_complaint", {
      //   resolutionNote: latestAction?.resolutionNote || "",
      //   acknowledgements: latestAction?.acknowledgements || "",
      //   timelineEvent: timelineEntry,
      //   status_of_client: finalStatus,
      // });
    }

    res.status(200).json({
      success: true,
      message: `Authorization ${status.toLowerCase()} successfully`,
      data: {
        finalStatus,
        timelineEntry,
        resetStatus,
      },
    });
  } catch (error) {
    console.error("Error in complaintAuthorizationStatusUpdate:", error);
    next(error);
  }
}
