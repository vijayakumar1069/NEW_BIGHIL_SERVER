import companyAdminSchema from "../../../schema/company.admin.schema.js";
import companySchema from "../../../schema/company.schema.js";
import generateSecurePassword from "../../../utils/generatesecurepassword.js";
import bcrypt from "bcryptjs";
import { WelcomeEmailSendFunction } from "../../../utils/send_welcome_email.js";

export async function addClient(req, res, next) {
  const { companyName, contactNumber, admins,companyEmail,companyAddress,companyType,companySize } = req.body;
  try {
    if (!companyName || !contactNumber || !admins || !companyEmail || !companyAddress || !companyType) {
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
    const client = new companySchema({ companyName, contactNumber,companyEmail,companyAddress,companyType,companySize });
    await client.save();
    let adminArray = [];
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
    admins 
  } = req.body;

  try {
    // Fetch current client data to compare
    const existingClient = await companySchema.findById(clientId);
    if (!existingClient) {
      const error = new Error(`Client ${clientId} not found`);
      error.statusCode = 404;
      throw error;
    }

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
    
    if (companySize !== undefined && companySize !== existingClient.companySize) {
      updateFields.companySize = companySize;
    }
    
    if (companyType && companyType !== existingClient.companyType) {
      updateFields.companyType = companyType;
    }
    
    if (visibleToIT !== undefined && visibleToIT !== existingClient.visibleToIT) {
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
      for (const admin of admins) {
        // Skip empty admin entries (when name and email are empty)
        if (!admin.name && !admin.email) {
          continue;
        }

        let existingAdmin = await companyAdminSchema.findOne({
          companyId: clientId,
          email: admin.email,
        });

        if (existingAdmin) {
          // Update existing admin
          const adminUpdateFields = {};
          
          if (admin.name && admin.name !== existingAdmin.name) {
            adminUpdateFields.name = admin.name;
          }
          
          if (admin.role && admin.role !== existingAdmin.role) {
            adminUpdateFields.role = admin.role;
          }

          if (Object.keys(adminUpdateFields).length > 0) {
            existingAdmin = await companyAdminSchema.findOneAndUpdate(
              { companyId: clientId, email: admin.email },
              { $set: adminUpdateFields },
              { new: true }
            );
          }
          updatedAdmins.push(existingAdmin);
        } else {
          // Create new admin
          const generatedPassword = generateSecurePassword(admin);
          const hashedPassword = await bcrypt.hash(generatedPassword, 10);

          const newAdmin = new companyAdminSchema({
            companyId: clientId,
            role: admin.role || "SUPER ADMIN", // Default role if not provided
            name: admin.name,
            email: admin.email,
            password: hashedPassword,
          });

          const savedAdmin = await newAdmin.save();
          updatedAdmins.push(savedAdmin);
        }
      }
    }

    // Fetch all admins for this company to return complete list
    const allAdmins = await companyAdminSchema.find({ companyId: clientId });

    // Create response object with updated client data and all admins
    const responseClient = {
      ...client._doc,
      admins: allAdmins
    };

    res.status(200).json({
      message: "Client and admins updated successfully",
      data: responseClient,
      success: true,
    });
  } catch (error) {
    next(error);
  }
}
