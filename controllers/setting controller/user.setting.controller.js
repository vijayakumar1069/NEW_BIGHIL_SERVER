import userSchema from "../../schema/user.schema.js";

export async function getCurrentUserSettingInfo(req, res, next) {
  try {
    const { id, role } = req.user;
    if (!id || !role) {
      throw new Error("User not found");
    }
    const currentUser = await userSchema.findById(id).select("-password");
    if (!currentUser) {
      throw new Error("User not found");
    }
    res.status(200).json({
      success: true,
      message: "Client setting fetched successfully",
      data: currentUser,
    });
  } catch (error) {
    next(error);
  }
}
export async function updateUserSetting(req, res, next) {
  try {
    const { id, role } = req.user;
    if (!id || !role) {
      throw new Error("User not found");
    }
    const { theme, notificationHidden, defaultCompany, defaultComplaintType } =
      req.body;
   
    const updateuser = await userSchema.findByIdAndUpdate(
      id,
      {
        theme,
        notificationHidden,
        defaultCompany,
        defaultComplaintType,
      },
      { new: true }
    );
   
    if (!updateuser) {
      throw new Error("User not found");
    }
    res.status(200).json({
      success: true,
      message: "User setting updated successfully",
      data: updateuser,
    });
  } catch (error) {
    next(error);
  }
}
