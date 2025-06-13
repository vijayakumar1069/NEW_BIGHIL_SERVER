import companyAdminSchema from "../../../schema/company.admin.schema.js";
import companySchema from "../../../schema/company.schema.js";
import generateSecurePassword from "../../../utils/generatesecurepassword.js";
import bcrypt from "bcryptjs";
import { WelcomeEmailSendFunction } from "../../../utils/send_welcome_email.js";
import complaintSchema from "../../../schema/complaint.schema.js";
import Note from "../../../schema/notes.schema.js";
import timeLineModel from "../../../schema/complaint.timeline.schema.js";
import resolution from "../../../schema/actionTaken.schema.js";
import notificationSchema from "../../../schema/notification.schema.js";
import Chat from "../../../schema/chats.schema.js";

export async function addClient(req, res, next) {
  const {
    companyName,
    contactNumber,
    admins,
    companyEmail,
    companyAddress,
    companyType,
    companySize,
  } = req.body;

  try {
    // 1. Validate Required Fields
    if (
      !companyName?.trim() ||
      !contactNumber?.trim() ||
      !Array.isArray(admins) ||
      admins.length === 0 ||
      !companyEmail?.trim() ||
      !companyAddress?.trim() ||
      !companyType?.trim()
    ) {
      const error = new Error("Missing or invalid required fields");
      error.statusCode = 400;
      throw error;
    }

    // 2. Validate Admins
    for (const admin of admins) {
      if (!admin.name?.trim() || !admin.email?.trim() || !admin.role?.trim()) {
        const error = new Error("Each admin must have name, email, and role");
        error.statusCode = 400;
        throw error;
      }
    }

    // 3. Check for Existing Client (by name, contact, or email)
    const existingClient = await companySchema.findOne({
      $or: [{ companyName }, { contactNumber }, { companyEmail }],
    });
    if (existingClient) {
      const error = new Error(
        "Client with provided name, number, or email already exists"
      );
      error.statusCode = 409; // Conflict
      throw error;
    }

    // 4. Save Client
    const client = new companySchema({
      companyName: companyName.trim(),
      contactNumber: contactNumber.trim(),
      companyEmail: companyEmail.trim().toLowerCase(),
      companyAddress: companyAddress.trim(),
      companyType: companyType.trim(),
      companySize: companySize || 0,
    });

    // 5. Save Admins
    const adminArray = [];

    for (const admin of admins) {
      const generatedPassword = generateSecurePassword(admin); // Secure random password
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      const newAdmin = new companyAdminSchema({
        companyId: client._id,
        name: admin.name.trim(),
        email: admin.email.trim().toLowerCase(),
        role: admin.role.trim(),
        password: hashedPassword,
      });

      // Prevent duplicate admins by email
      const existingAdmin = await companyAdminSchema.findOne({
        email: newAdmin.email,
        companyId: client._id,
      });
      if (existingAdmin) {
        continue; // Skip duplicate admin
      }

      await newAdmin.save();
      adminArray.push(newAdmin);

      // Send welcome email
      const emailResponse = await WelcomeEmailSendFunction({
        name: admin.name,
        email: admin.email,
        password: generatedPassword,
        role: admin.role,
      });

      if (emailResponse.status !== 200) {
        const error = new Error(
          `Error sending email to ${admin.email}: ${emailResponse.message}`
        );
        error.statusCode = 500;
        throw error;
      }
    }

    await client.save();
    // 6. Final Response
    const responseData = { ...client._doc, admins: adminArray };
    res.status(200).json({
      message: "Client and admins added successfully",
      data: responseData,
      success: true,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllClients(req, res, next) {
  try {
    const clients = await companySchema.find().sort({ createdAt: -1 });
    if (!clients) {
      const error = new Error("No clients found");
      error.statusCode = 404;
      throw error;
    }
    const admin = await companyAdminSchema.find();
    const clientsWithAdmins = clients.map((client) => {
      const admins = admin.filter(
        (admin) => admin.companyId.toString() === client._id.toString()
      );
      return {
        ...client._doc,
        admins,
      };
    });

    res.status(200).json({
      message: "All clients retrieved successfully",
      data: clientsWithAdmins,
      success: true,
    });
  } catch (error) {
    next(error);
  }
}
export async function searchClients(req, res, next) {
  try {
    const { q } = req.query; // Get search query from query parameters

    if (!q || q.trim() === "") {
      const error = new Error("Search query is required");
      error.statusCode = 400;
      throw error;
    }

    const searchTerm = q.trim();

    // Create search query for MongoDB
    // Using $regex for case-insensitive partial matching
    const searchQuery = {
      $or: [
        {
          companyName: {
            $regex: searchTerm,
            $options: "i", // case-insensitive
          },
        },
        {
          location: {
            $regex: searchTerm,
            $options: "i",
          },
        },
      ],
    };

    // Find clients matching the search criteria
    const clients = await companySchema.find(searchQuery);

    // Get admins for the found clients
    const admin = await companyAdminSchema.find();

    // Map clients with their respective admins
    const clientsWithAdmins = clients.map((client) => {
      const admins = admin.filter(
        (admin) => admin.companyId.toString() === client._id.toString()
      );
      return {
        ...client._doc,
        admins,
      };
    });

    res.status(200).json({
      message: `Found ${clientsWithAdmins.length} client${clientsWithAdmins.length === 1 ? "" : "s"} matching "${searchTerm}"`,
      data: clientsWithAdmins,
      success: true,
      searchTerm: searchTerm,
      totalResults: clientsWithAdmins.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateClient(req, res, next) {
  const { clientId } = req.params;
  const {
    companyName,
    contactNumber,
    companyEmail,
    companyAddress,
    companySize,
    companyType,
    visibleToIT,
    admins,
  } = req.body;

  try {
    if (!clientId || typeof clientId !== "string") {
      throw new Error("Invalid client ID");
    }

    const existingClient = await companySchema.findById(clientId);
    if (!existingClient) {
      const error = new Error("Client not found");
      error.statusCode = 404;
      throw error;
    }

    const updateFields = {};

    if (companyName && companyName !== existingClient.companyName) {
      updateFields.companyName = companyName.trim();
    }
    if (contactNumber && contactNumber !== existingClient.contactNumber) {
      updateFields.contactNumber = contactNumber.trim();
    }
    if (companyEmail && companyEmail !== existingClient.companyEmail) {
      updateFields.companyEmail = companyEmail.trim().toLowerCase();
    }
    if (companyAddress && companyAddress !== existingClient.companyAddress) {
      updateFields.companyAddress = companyAddress.trim();
    }
    if (
      companySize !== undefined &&
      companySize !== existingClient.companySize
    ) {
      updateFields.companySize = companySize;
    }
    if (companyType && companyType !== existingClient.companyType) {
      updateFields.companyType = companyType.trim();
    }
    if (
      visibleToIT !== undefined &&
      visibleToIT !== existingClient.visibleToIT
    ) {
      updateFields.visibleToIT = visibleToIT;
    }

    let client = existingClient;
    if (Object.keys(updateFields).length > 0) {
      client = await companySchema.findByIdAndUpdate(clientId, updateFields, {
        new: true,
      });
    }

    const updatedAdmins = [];

    if (Array.isArray(admins)) {
      // ✅ Duplicate email check within incoming array
      const seenEmails = new Set();
      for (const admin of admins) {
        if (admin?.email) {
          const email = admin.email.trim().toLowerCase();
          if (seenEmails.has(email)) {
            const error = new Error(
              `Duplicate email "${email}" found in admin list`
            );
            error.statusCode = 400;
            throw error;
          }
          seenEmails.add(email);
        }
      }

      const existingAdmins = await companyAdminSchema.find({
        companyId: clientId,
      });

      const adminEmailsToKeep = new Set();
      const adminIdsToKeep = new Set();

      for (const admin of admins) {
        if (
          !admin ||
          (!admin.name && !admin.email) ||
          typeof admin.email !== "string"
        ) {
          continue;
        }

        const email = admin.email.trim().toLowerCase();
        const name = admin.name?.trim();
        const role = admin.role?.trim() || "SUPER ADMIN";

        adminEmailsToKeep.add(email);
        if (admin._id) adminIdsToKeep.add(admin._id);

        let existingAdmin = null;

        if (admin._id) {
          existingAdmin = await companyAdminSchema.findOne({
            _id: admin._id,
            companyId: clientId,
          });
        }

        if (!existingAdmin) {
          existingAdmin = await companyAdminSchema.findOne({
            companyId: clientId,
            email,
          });
        }

        if (existingAdmin) {
          const updates = {};

          if (name && name !== existingAdmin.name) updates.name = name;
          if (email !== existingAdmin.email) updates.email = email;
          if (role !== existingAdmin.role) updates.role = role;

          if (Object.keys(updates).length > 0) {
            existingAdmin = await companyAdminSchema.findByIdAndUpdate(
              existingAdmin._id,
              { $set: updates },
              { new: true }
            );
          }

          updatedAdmins.push(existingAdmin);
        } else {
          // ✅ Ensure email is globally unique
          const emailExistsGlobally = await companyAdminSchema.findOne({
            email,
          });
          if (emailExistsGlobally) {
            const error = new Error(`Email ${email} already exists`);
            error.statusCode = 400;
            throw error;
          }

          const generatedPassword = generateSecurePassword(admin);
          const hashedPassword = await bcrypt.hash(generatedPassword, 10);

          const newAdmin = new companyAdminSchema({
            companyId: clientId,
            role,
            name,
            email,
            password: hashedPassword,
          });

          const emailResult = await WelcomeEmailSendFunction({
            name,
            email,
            password: generatedPassword,
            role,
          });

          if (emailResult.status !== 200) {
            const error = new Error(
              `Error sending email: ${emailResult.message}`
            );
            error.statusCode = 500;
            throw error;
          }

          const savedAdmin = await newAdmin.save();
          updatedAdmins.push(savedAdmin);
        }
      }

      // Remove old admins not in current list
      const adminsToRemove = existingAdmins.filter((admin) => {
        return (
          !adminEmailsToKeep.has(admin.email.toLowerCase()) &&
          !adminIdsToKeep.has(admin._id.toString())
        );
      });

      if (adminsToRemove.length > 0) {
        await companyAdminSchema.deleteMany({
          _id: { $in: adminsToRemove.map((admin) => admin._id) },
          companyId: clientId,
        });
      }
    }

    const allAdmins = await companyAdminSchema
      .find({ companyId: clientId })
      .sort({ createdAt: 1 });

    const responseClient = { ...client._doc, admins: allAdmins };

    res.status(200).json({
      message: "Client and admins updated successfully",
      data: responseClient,
      success: true,
    });
  } catch (error) {
    console.error("Update Client Error:", error);
    next(error);
  }
}

export async function deletClient(req, res, next) {
  const { clientId } = req.params;

  try {
    // 1. Check if the company exists
    const company = await companySchema.findById(clientId);
    if (!company) {
      const error = new Error("Client not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Get all complaints for this company
    const complaints = await complaintSchema.find({
      companyId: clientId,
    });

    const complaintIds = complaints.map((complaint) => complaint._id);

    // 3. Delete all related data in parallel for better performance
    const deletePromises = [];

    if (complaintIds.length > 0) {
      // Delete timelines
      deletePromises.push(
        timeLineModel.deleteMany({
          complaintId: { $in: complaintIds },
        })
      );

      // Delete notes
      deletePromises.push(
        Note.deleteMany({
          complaintId: { $in: complaintIds },
        })
      );

      // Delete chats
      deletePromises.push(
        Chat.deleteMany({
          complaintId: { $in: complaintIds },
        })
      );

      // Delete resolutions
      deletePromises.push(
        resolution.deleteMany({
          complaintId: { $in: complaintIds },
        })
      );

      // Delete notifications
      deletePromises.push(
        notificationSchema.deleteMany({
          complaintId: { $in: complaintIds },
        })
      );

      // Delete complaints
      deletePromises.push(
        complaintSchema.deleteMany({
          companyId: clientId,
        })
      );
    }

    // Delete company admins
    deletePromises.push(
      companyAdminSchema.deleteMany({
        companyId: clientId,
      })
    );

    // Wait for all deletions to complete
    const deletionResults = await Promise.all(deletePromises);

    // Delete the company last
    await companySchema.findByIdAndDelete(clientId);

    // Calculate total deleted documents
    const totalDeleted = deletionResults.reduce((sum, result) => {
      return sum + (result.deletedCount || 0);
    }, 0);

    res.status(200).json({
      message: "Client and all related data deleted successfully",
      data: {
        clientId: clientId,
        totalRelatedDocumentsDeleted: totalDeleted,
        deletedAt: new Date(),
      },
      success: true,
    });
  } catch (error) {
    console.error("Error deleting client:", error);
    next(error);
  }
}
