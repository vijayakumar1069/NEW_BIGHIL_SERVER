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
import mongoose from "mongoose";

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

    // 2. Validate Admin Fields
    for (const admin of admins) {
      if (!admin.name?.trim() || !admin.email?.trim() || !admin.role?.trim()) {
        const error = new Error("Each admin must have name, email, and role");
        error.statusCode = 400;
        throw error;
      }
    }

    // 3. Check for duplicate emails in request
    const adminEmails = admins.map((a) => a.email.trim().toLowerCase());
    const emailSet = new Set(adminEmails);

    if (emailSet.size !== adminEmails.length) {
      const error = new Error("Duplicate admin emails found in the request");
      error.statusCode = 400;
      throw error;
    }

    // 4. Check if any admin emails already exist in DB
    const existingAdmins = await companyAdminSchema.find({
      email: { $in: adminEmails },
    });

    if (existingAdmins.length > 0) {
      const existingEmails = existingAdmins.map((a) => a.email);
      const error = new Error(
        `Admin emails already exist: ${existingEmails.join(", ")}`
      );
      error.statusCode = 409;
      throw error;
    }

    // 5. Check for existing client
    const existingClient = await companySchema.findOne({
      $or: [
        { companyName: companyName.trim() },
        { contactNumber: contactNumber.trim() },
        { companyEmail: companyEmail.trim().toLowerCase() },
      ],
    });

    if (existingClient) {
      const error = new Error(
        "Client with provided name, number, or email already exists"
      );
      error.statusCode = 409;
      throw error;
    }

    // 6. Save client
    const client = new companySchema({
      companyName: companyName.trim(),
      contactNumber: contactNumber.trim(),
      companyEmail: companyEmail.trim().toLowerCase(),
      companyAddress: companyAddress.trim(),
      companyType: companyType.trim(),
      companySize: companySize || 0,
    });

    await client.save();

    // 7. Save admins
    const adminArray = [];

    for (const admin of admins) {
      const generatedPassword = generateSecurePassword(admin); // You must define this
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      const newAdmin = new companyAdminSchema({
        companyId: client._id,
        name: admin.name.trim(),
        email: admin.email.trim().toLowerCase(),
        role: admin.role.trim(),
        password: hashedPassword,
      });

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

    // 8. Final Response
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
    // Validate clientId
    if (
      !clientId ||
      typeof clientId !== "string" ||
      !mongoose.Types.ObjectId.isValid(clientId)
    ) {
      const error = new Error("Invalid client ID format");
      error.statusCode = 400;
      throw error;
    }

    // Check if client exists
    const existingClient = await companySchema.findById(clientId);
    if (!existingClient) {
      const error = new Error("Client not found");
      error.statusCode = 404;
      throw error;
    }

    // Update company fields
    const updateFields = {};

    if (companyName && companyName.trim() !== existingClient.companyName) {
      // Check if company name is unique (excluding current client)
      const existingCompanyName = await companySchema.findOne({
        companyName: companyName.trim(),
        _id: { $ne: clientId },
      });
      if (existingCompanyName) {
        const error = new Error("Company name already exists");
        error.statusCode = 400;
        throw error;
      }
      updateFields.companyName = companyName.trim();
    }

    if (
      contactNumber &&
      contactNumber.trim() !== existingClient.contactNumber
    ) {
      // Check if contact number is unique (excluding current client)
      const existingContactNumber = await companySchema.findOne({
        contactNumber: contactNumber.trim(),
        _id: { $ne: clientId },
      });
      if (existingContactNumber) {
        const error = new Error("Contact number already exists");
        error.statusCode = 400;
        throw error;
      }
      updateFields.contactNumber = contactNumber.trim();
    }

    if (
      companyEmail &&
      companyEmail.trim().toLowerCase() !== existingClient.companyEmail
    ) {
      updateFields.companyEmail = companyEmail.trim().toLowerCase();
    }
    if (
      companyAddress &&
      companyAddress.trim() !== existingClient.companyAddress
    ) {
      updateFields.companyAddress = companyAddress.trim();
    }
    if (
      companySize !== undefined &&
      companySize !== existingClient.companySize
    ) {
      if (typeof companySize !== "number" || companySize < 0) {
        const error = new Error("Company size must be a non-negative number");
        error.statusCode = 400;
        throw error;
      }
      updateFields.companySize = companySize;
    }
    if (companyType && companyType.trim() !== existingClient.companyType) {
      updateFields.companyType = companyType.trim();
    }
    if (
      visibleToIT !== undefined &&
      visibleToIT !== existingClient.visibleToIT
    ) {
      updateFields.visibleToIT = visibleToIT;
    }

    // Update company if there are changes
    let client = existingClient;
    if (Object.keys(updateFields).length > 0) {
      client = await companySchema.findByIdAndUpdate(clientId, updateFields, {
        new: true,
        runValidators: true,
      });
    }

    // Handle admin updates
    if (Array.isArray(admins)) {
      await handleAdminUpdates(clientId, admins);
    }

    // Get all updated admins
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

async function handleAdminUpdates(clientId, admins) {
  // Validate admin data structure
  if (!Array.isArray(admins)) {
    const error = new Error("Admins must be an array");
    error.statusCode = 400;
    throw error;
  }

  // Check for duplicate emails in the incoming array
  const incomingEmails = new Set();
  const validAdmins = [];

  for (const admin of admins) {
    // Validate admin object structure
    if (!admin || typeof admin !== "object") {
      const error = new Error("Invalid admin object");
      error.statusCode = 400;
      throw error;
    }

    // Validate required fields
    if (!admin.email || typeof admin.email !== "string") {
      const error = new Error("Admin email is required and must be a string");
      error.statusCode = 400;
      throw error;
    }

    if (!admin.name || typeof admin.name !== "string") {
      const error = new Error("Admin name is required and must be a string");
      error.statusCode = 400;
      throw error;
    }

    const email = admin.email.trim().toLowerCase();
    const name = admin.name.trim();
    const role = admin.role?.trim() || "SUPER ADMIN";

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = new Error(`Invalid email format: ${email}`);
      error.statusCode = 400;
      throw error;
    }

    // Validate role
    const validRoles = ["SUPER ADMIN", "ADMIN", "SUB ADMIN"];
    if (!validRoles.includes(role)) {
      const error = new Error(
        `Invalid role: ${role}. Valid roles are: ${validRoles.join(", ")}`
      );
      error.statusCode = 400;
      throw error;
    }

    // Check for duplicate emails in incoming array
    if (incomingEmails.has(email)) {
      const error = new Error(`Duplicate email "${email}" found in admin list`);
      error.statusCode = 400;
      throw error;
    }
    incomingEmails.add(email);

    validAdmins.push({
      _id: admin._id,
      email,
      name,
      role,
    });
  }

  // Check for global email uniqueness (excluding admins from this company)
  for (const admin of validAdmins) {
    const existingGlobalAdmin = await companyAdminSchema.findOne({
      email: admin.email,
      companyId: { $ne: clientId },
    });

    if (existingGlobalAdmin) {
      const error = new Error(
        `Email ${admin.email} is already used by another company`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Get existing admins for this company
  const existingAdmins = await companyAdminSchema.find({ companyId: clientId });

  // Track which admins to keep, update, create, or delete
  const adminEmailsToKeep = new Set();
  const processedAdminIds = new Set();
  const updatedAdmins = [];

  // Process each incoming admin
  for (const admin of validAdmins) {
    adminEmailsToKeep.add(admin.email);

    let existingAdmin = null;

    // First, try to find by ID if provided
    if (admin._id && mongoose.Types.ObjectId.isValid(admin._id)) {
      existingAdmin = existingAdmins.find(
        (ea) =>
          ea._id.toString() === admin._id &&
          ea.companyId.toString() === clientId
      );
    }

    // If not found by ID, try to find by email within the same company
    if (!existingAdmin) {
      existingAdmin = existingAdmins.find(
        (ea) =>
          ea.email.toLowerCase() === admin.email &&
          ea.companyId.toString() === clientId
      );
    }

    if (existingAdmin) {
      // Mark this admin as processed
      processedAdminIds.add(existingAdmin._id.toString());

      // Check if email is changing
      if (existingAdmin.email.toLowerCase() !== admin.email) {
        // Email is changing - delete old admin and create new one
        await companyAdminSchema.findByIdAndDelete(existingAdmin._id);

        // Create new admin with new email
        const newAdmin = await createNewAdmin(clientId, admin);
        updatedAdmins.push(newAdmin);
      } else {
        // Email is not changing - update existing admin
        const updates = {};

        if (admin.name !== existingAdmin.name) updates.name = admin.name;
        if (admin.role !== existingAdmin.role) updates.role = admin.role;

        if (Object.keys(updates).length > 0) {
          const updatedAdmin = await companyAdminSchema.findByIdAndUpdate(
            existingAdmin._id,
            { $set: updates },
            { new: true, runValidators: true }
          );
          updatedAdmins.push(updatedAdmin);
        } else {
          updatedAdmins.push(existingAdmin);
        }
      }
    } else {
      // Create new admin
      const newAdmin = await createNewAdmin(clientId, admin);
      updatedAdmins.push(newAdmin);
    }
  }

  // Remove admins that are no longer in the list
  const adminsToRemove = existingAdmins.filter(
    (admin) =>
      !adminEmailsToKeep.has(admin.email.toLowerCase()) &&
      !processedAdminIds.has(admin._id.toString())
  );

  if (adminsToRemove.length > 0) {
    await companyAdminSchema.deleteMany({
      _id: { $in: adminsToRemove.map((admin) => admin._id) },
      companyId: clientId,
    });
  }

  return updatedAdmins;
}

async function createNewAdmin(clientId, adminData) {
  const { email, name, role } = adminData;

  // Generate secure password
  const generatedPassword = generateSecurePassword(adminData);
  const hashedPassword = await bcrypt.hash(generatedPassword, 10);

  // Create new admin
  const newAdmin = new companyAdminSchema({
    companyId: clientId,
    role,
    name,
    email,
    password: hashedPassword,
  });

  // Send welcome email
  const emailResult = await WelcomeEmailSendFunction({
    name,
    email,
    password: generatedPassword,
    role,
  });

  if (emailResult.status !== 200) {
    const error = new Error(`Error sending email: ${emailResult.message}`);
    error.statusCode = 500;
    throw error;
  }

  // Save and return new admin
  const savedAdmin = await newAdmin.save();
  return savedAdmin;
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
