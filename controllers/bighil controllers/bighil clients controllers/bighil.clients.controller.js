import companyAdminSchema from "../../../schema/company.admin.schema.js";
import companySchema from "../../../schema/company.schema.js";
import generateSecurePassword from "../../../utils/generatesecurepassword.js";
import bcrypt from "bcryptjs";
import { WelcomeEmailSendFunction } from "../../../utils/send_welcome_email.js";

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
    if (
      !companyName ||
      !contactNumber ||
      !admins ||
      !companyEmail ||
      !companyAddress ||
      !companyType
    ) {
      const error = new Error(`Invalid input data`);
      error.statusCode = 400;
      throw error;
    }
    if (companyName && contactNumber) {
      const existingClient = await companySchema.findOne({
        companyName,
        contactNumber,
        companyEmail,
      });
      if (existingClient) {
        const error = new Error("Client already exists");
        error.statusCode = 400;
        throw error;
      }
    }
    const client = new companySchema({
      companyName,
      contactNumber,
      companyEmail,
      companyAddress,
      companyType,
      companySize,
    });
    await client.save();
    let adminArray = [];
    console.log(admins);
    for (const admin of admins) {
      // Generate password BEFORE creating admin
      const generatedPassword = generateSecurePassword(admin); // Pass admin data

      const hashedPassword = await bcrypt.hash(generatedPassword, 10); // Use generated password

      const newAdmin = new companyAdminSchema({
        companyId: client._id,
        role: admin.role,
        name: admin.name,
        email: admin.email,
        password: hashedPassword, // Use the hashed generated password
      });

      await newAdmin.save();
      adminArray.push(newAdmin);
      const emailsSend = await WelcomeEmailSendFunction({
        name: admin.name,
        email: admin.email,
        password: generatedPassword,
        role: admin.role,
      });
      if (emailsSend.status != 200) {
        const error = new Error(`Error sending emails: ${emailsSend.message}`);
        error.statusCode = 500;
        throw error;
      }
    }
    const returnData = { ...client._doc, admins: adminArray };

    res.status(200).json({
      message: "Client and admins added successfully",
      data: returnData,
      success: true,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllClients(req, res, next) {
  try {
    const clients = await companySchema.find();
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

export async function deletClient(req, res, next) {
  const { clientId } = req.params;

  try {
    const client = await companySchema.findByIdAndDelete(clientId);
    const deleteAdmins = await companyAdminSchema.findOneAndDelete({
      companyId: clientId,
    });

    if (!client) {
      const error = new Error("Client not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      message: "Client deleted successfully",
      data: client,
      success: true,
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
    // Fetch current client data to compare
    const existingClient = await companySchema.findById(clientId);
    if (!existingClient) {
      const error = new Error(`Client not found`);
      error.statusCode = 404;
      throw error;
    }

    console.log("admins", admins);

    // Construct the update object dynamically (only update if value changed)
    const updateFields = {};

    if (companyName && companyName !== existingClient.companyName) {
      updateFields.companyName = companyName;
    }

    if (contactNumber && contactNumber !== existingClient.contactNumber) {
      updateFields.contactNumber = contactNumber;
    }

    if (companyEmail && companyEmail !== existingClient.companyEmail) {
      updateFields.companyEmail = companyEmail;
    }

    if (companyAddress && companyAddress !== existingClient.companyAddress) {
      updateFields.companyAddress = companyAddress;
    }

    if (
      companySize !== undefined &&
      companySize !== existingClient.companySize
    ) {
      updateFields.companySize = companySize;
    }

    if (companyType && companyType !== existingClient.companyType) {
      updateFields.companyType = companyType;
    }

    if (
      visibleToIT !== undefined &&
      visibleToIT !== existingClient.visibleToIT
    ) {
      updateFields.visibleToIT = visibleToIT;
    }

    // Update the client only if there are changes
    let client = existingClient;
    if (Object.keys(updateFields).length > 0) {
      client = await companySchema.findByIdAndUpdate(clientId, updateFields, {
        new: true,
      });
    }

    let updatedAdmins = [];

    if (admins && admins.length > 0) {
      // Get all existing admins for this company
      const existingAdmins = await companyAdminSchema.find({
        companyId: clientId,
      });

      // Create a Set of admin IDs/emails that should remain after update
      const adminEmailsToKeep = new Set();
      const adminIdsToKeep = new Set();

      for (const admin of admins) {
        // Skip empty admin entries
        if (!admin.name && !admin.email) {
          continue;
        }

        adminEmailsToKeep.add(admin.email);
        if (admin._id) {
          adminIdsToKeep.add(admin._id);
        }

        let existingAdmin = null;

        // First try to find by ID if provided
        if (admin._id) {
          existingAdmin = await companyAdminSchema.findOne({
            _id: admin._id,
            companyId: clientId,
          });
        }

        // If not found by ID, try by email
        if (!existingAdmin) {
          existingAdmin = await companyAdminSchema.findOne({
            companyId: clientId,
            email: admin.email,
          });
        }

        if (existingAdmin) {
          // Update existing admin
          const adminUpdateFields = {};

          if (admin.name && admin.name !== existingAdmin.name) {
            adminUpdateFields.name = admin.name;
          }

          if (admin.email && admin.email !== existingAdmin.email) {
            adminUpdateFields.email = admin.email;
          }

          if (admin.role && admin.role !== existingAdmin.role) {
            adminUpdateFields.role = admin.role;
          }

          if (Object.keys(adminUpdateFields).length > 0) {
            existingAdmin = await companyAdminSchema.findByIdAndUpdate(
              existingAdmin._id,
              { $set: adminUpdateFields },
              { new: true }
            );
          }
          updatedAdmins.push(existingAdmin);
        } else {
          // Create new admin only if it doesn't exist
          const generatedPassword = generateSecurePassword(admin);
          const hashedPassword = await bcrypt.hash(generatedPassword, 10);
          const checkIfEmailExists = await companyAdminSchema.findOne({
            email: admin.email,
          });
          if (checkIfEmailExists) {
            const error = new Error(`Email ${admin.email} already exists`);
            error.statusCode = 400;
            throw error;
          }
          const newAdmin = new companyAdminSchema({
            companyId: clientId,
            role: admin.role || "SUPER ADMIN",
            name: admin.name,
            email: admin.email,
            password: hashedPassword,
          });

          // Send welcome email before saving
          const emailsSend = await WelcomeEmailSendFunction({
            name: newAdmin.name,
            email: newAdmin.email,
            password: generatedPassword,
            role: newAdmin.role,
          });

          if (emailsSend.status != 200) {
            const error = new Error(
              `Error sending emails: ${emailsSend.message}`
            );
            error.statusCode = 500;
            throw error;
          }

          const savedAdmin = await newAdmin.save();
          updatedAdmins.push(savedAdmin);
        }
      }

      // Remove admins that are no longer in the updated list
      const adminsToRemove = existingAdmins.filter((admin) => {
        // Keep admin if it's in the emails to keep OR if it has an ID that should be kept
        return (
          !adminEmailsToKeep.has(admin.email) &&
          !adminIdsToKeep.has(admin._id.toString())
        );
      });

      if (adminsToRemove.length > 0) {
        const adminIdsToDelete = adminsToRemove.map((admin) => admin._id);
        await companyAdminSchema.deleteMany({
          _id: { $in: adminIdsToDelete },
          companyId: clientId,
        });

        console.log(
          `Removed ${adminsToRemove.length} admins:`,
          adminIdsToDelete
        );
      }
    }

    // Fetch all current admins for this company to return complete list
    const allAdmins = await companyAdminSchema
      .find({ companyId: clientId })
      .sort({ createdAt: 1 });

    // Create response object with updated client data and all admins
    const responseClient = { ...client._doc, admins: allAdmins };

    console.log("Updated client:", responseClient);

    res.status(200).json({
      message: "Client and admins updated successfully",
      data: responseClient,
      success: true,
    });
  } catch (error) {
    next(error);
  }
}
