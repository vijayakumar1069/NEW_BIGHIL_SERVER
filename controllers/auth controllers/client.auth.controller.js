import companyAdminSchema from "../../schema/company.admin.schema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
export async function clientLoginFunction(req, res, next) {
  try {
    const { email, password } = req.body;
    const clientAdmin = await companyAdminSchema.findOne({ email: email });
    if (!clientAdmin) {
      const error = new Error("Invalid email or password");
      error.status = 401;
      throw error;
    }
    const isMatch = await bcrypt.compare(password, clientAdmin.password);
    if (!isMatch) {
      const error = new Error("Invalid email or password");
      error.status = 401;
      throw error;
    }
    // 3. Generate JWT token
    const token = jwt.sign(
      { id: clientAdmin._id, role: clientAdmin.role, email: clientAdmin.email },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // 4. Send response with cookie
    // res.cookie("access_token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_DEV === "production",
    //   sameSite: "strict",
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiration
    // });
    res.status(200).json({
      message: "Login successful",

      user: {
        id: clientAdmin._id,
        role: clientAdmin.role,
        email: clientAdmin.email,
      },
      token: token,
      success: true,
    });
  } catch (error) {
    next(error);
  }
}

export async function clientLogoutFunction(req, res, next) {
  try {
    // Clear the access token cookie
    res.clearCookie("access_token");
    res.status(200).json({
      message: "Logout successful",
      success: true,
    });
  } catch (error) {
    next(error);
  }
}
