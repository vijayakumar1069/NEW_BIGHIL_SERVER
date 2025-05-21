import bighilUserSchema from "../../schema/bighil.user.schema.js";
import companyAdminSchema from "../../schema/company.admin.schema.js";
import userSchema from "../../schema/user.schema.js";
import { roles } from "../../utils/roles_const.js";
import bcrypt from "bcryptjs";

export async function getAccountInfo(req, res, next) {
  try {
    const { id, role } = req.user;
    if (role == "user") {
      const currentUser = await userSchema.findById(id);
      if (!currentUser) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }
      const { password, ...rest } = currentUser._doc;

      res.status(200).json({
        success: true,
        message: "Client setting fetched successfully",
        data: rest,
      });
    } else if (roles.includes(role)) {
      const currentAdmin = await companyAdminSchema.findById(id);
      if (!currentAdmin) {
        const error = new Error("Admin not found");
        error.status = 404;
        throw error;
      }
      const { password, ...rest } = currentAdmin._doc;

      res.status(200).json({
        success: true,
        message: "Client setting fetched successfully",
        data: rest,
      });
    } else {
      const bighilAdmin = await bighilUserSchema.findById(id);
      if (!bighilAdmin) {
        const error = new Error("Admin not found");
        error.status = 404;
        throw error;
      }
      const { password, ...rest } = bighilAdmin._doc;

      res.status(200).json({
        success: true,
        message: "Client setting fetched successfully",
        data: rest,
      });
    }
  } catch (error) {
    next(error);
  }
}

export async function updateAccountInfo(req, res, next) {
  const { newPassword, confirmPassword } = req.body;
  const { id, role } = req.user;
  try {
    if (role == "user") {
      const currentUser = await userSchema.findById(id);
      if (!currentUser) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }
      const oldpassword = bcrypt.compareSync(newPassword, currentUser.password);
      if (oldpassword) {
        const error = new Error("Old password and new password are same");
        error.status = 400;
        throw error;
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      currentUser.password = hashedPassword;
      await currentUser.save();

      res.status(200).json({
        success: true,
        message: "Client setting updated successfully",
        // data: currentUser,
      });
    } else if (roles.includes(role)) {
      const currentAdmin = await companyAdminSchema.findById(id);
      if (!currentAdmin) {
        const error = new Error("Admin not found");
        error.status = 404;
        throw error;
      }
      const oldpassword = bcrypt.compareSync(
        newPassword,
        currentAdmin.password
      );
      if (oldpassword) {
        const error = new Error("Old password and new password are same");
        error.status = 400;
        throw error;
      }
      if (newPassword && confirmPassword && newPassword === confirmPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        currentAdmin.password = hashedPassword;
        await currentAdmin.save();
      }

      res.status(200).json({
        success: true,
        message: "Client setting updated successfully",
        // data: currentAdmin,
      });
    } else {
      const bighilAdmin = await bighilUserSchema.findById(id);
      if (!bighilAdmin) {
        const error = new Error("Admin not found");
        error.status = 404;
        throw error;
      }

      const oldpassword = bcrypt.compareSync(newPassword, bighilAdmin.password);
      if (oldpassword) {
        const error = new Error("Old password and new password are same");
        error.status = 400;
        throw error;
      }
      if (newPassword && confirmPassword && newPassword === confirmPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        bighilAdmin.password = hashedPassword;
        await bighilAdmin.save();
      }

      res.status(200).json({
        success: true,
        message: "Client setting updated successfully",
        // data: bighilAdmin,
      });
    }
  } catch (error) {
    next(error);
  }
}
