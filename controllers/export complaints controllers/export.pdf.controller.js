import PDFService from "./PDFService.js";
import fs from "fs";

export const generateComplaintPDF = async (req, res) => {
  try {
    const { complaintId } = req.params;

    // Generate a temporary file path
    const outputPath = `/tmp/complaint-${complaintId}-${Date.now()}.pdf`;

    // Generate the PDF
    await PDFService.generateComplaintPDF(complaintId, outputPath);

    // Send the PDF as a download
    res.download(outputPath, `complaint-${complaintId}.pdf`, (err) => {
      if (err) {
        console.error("Error sending PDF:", err);
      }

      // Clean up the temporary file
      setTimeout(() => {
        try {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
        } catch (e) {
          console.error("Error removing temp file:", e);
        }
      }, 5000);
    });
  } catch (error) {
    console.error("Error in generateComplaintPDF:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};

export const generateComplaintPDFStream = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Received request for complaint ID:", id);

    // Generate PDF buffer
    const buffer = await PDFService.generateComplaintPDFBuffer(id);

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=complaint-${id}.pdf`
    );

    // Send the buffer
    res.end(buffer);
  } catch (error) {
    console.error("Error in generateComplaintPDFStream:", error);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
};
