import express from "express";
import {
  ClientResetPassword,
  resetPasswordForBighil,
  resetPasswordForUser,
  sendOtpForBighil,
  sendOtpForClientPasswordReset,
  sendOtpForUser,
  twoFaResendOtpForClient,
  verifyOtpForBighil,
  verifyOtpForClient,
  verifyOtpForUser,
} from "../../controllers/forgot password controllers/forgot.password.controllers.js";

const ForgotPasswordRouter = express.Router();

ForgotPasswordRouter.post("/client/sendOtp", sendOtpForClientPasswordReset);
ForgotPasswordRouter.post("/client/verifyOtp", verifyOtpForClient);
ForgotPasswordRouter.post("/client/resetPassword", ClientResetPassword);
ForgotPasswordRouter.post("/client/resendOtp", twoFaResendOtpForClient);
ForgotPasswordRouter.post("/user/sendOtp", sendOtpForUser);
ForgotPasswordRouter.post("/user/verifyOtp", verifyOtpForUser);
ForgotPasswordRouter.post("/user/resetPassword", resetPasswordForUser);
ForgotPasswordRouter.post("/bighil/sendOtp", sendOtpForBighil);
ForgotPasswordRouter.post("/bighil/verifyOtp", verifyOtpForBighil);
ForgotPasswordRouter.post("/bighil/resetPassword", resetPasswordForBighil);

export default ForgotPasswordRouter;
