import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import { dirname } from "path";
import complaintSchema from "../../schema/complaint.schema.js";
import Chat from "../../schema/chats.schema.js";
import complaintTimelineSchema from "../../schema/complaint.timeline.schema.js";
import Note from "../../schema/notes.schema.js";
import actionTakenSchema from "../../schema/actionTaken.schema.js";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class PDFService {
  constructor() {
    // Load the EJS template
    this.templatePath = path.join(
      __dirname,
      "../../email templates/complaint-pdf-template.ejs"
    );
    this.template = fs.readFileSync(this.templatePath, "utf8");
  }

  async generateComplaintPDF(complaintId, outputPath) {
    try {
      // Fetch all related data
      const data = await this.fetchComplaintData(complaintId);

      // Render the HTML
      const html = await ejs.render(this.template, data, { async: true });

      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      // Set content and wait for rendering to complete
      await page.setContent(html, { waitUntil: "networkidle0" });

      // Generate PDF with correct settings for colors
      await page.pdf({
        path: outputPath,
        format: "A4",
        printBackground: true, // Critical for background colors
        margin: {
          top: "5mm",
          right: "5mm",
          bottom: "5mm",
          left: "5mm",
        },
      });

      await browser.close();
      return { filename: outputPath };
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw error;
    }
  }

  async generateComplaintPDFBuffer(complaintId) {
    try {
      // Fetch all related data
      const data = await this.fetchComplaintData(complaintId);

      // Render the HTML
      const html = await ejs.render(this.template, data, { async: true });

      // Generate PDF buffer using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();

      // Set content and wait for rendering to complete
      await page.setContent(html, { waitUntil: "networkidle0" });

      // Generate PDF buffer
      const buffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "15mm",
          right: "10mm",
          bottom: "15mm",
          left: "10mm",
        },
        displayHeaderFooter: false,
        scale: 0.95, // Slightly scale down content to fit better
      });

      await browser.close();
      return buffer;
    } catch (error) {
      console.error("Error generating PDF buffer:", error);
      throw error;
    }
  }

  async fetchComplaintData(complaintId) {
    // Fetch all related data
    const complaint = await complaintSchema.findById(complaintId).lean();
    if (!complaint) {
      throw new Error("Complaint not found");
    }

    const [chat, timeline, notes, resolution] = await Promise.all([
      Chat.findOne({ complaintId }).lean(),
      complaintTimelineSchema
        .find({ complaintId })
        .sort({ timestamp: 1 })
        .lean(),
      Note.find({ complaintId }).sort({ createdAt: 1 }).lean(),
      actionTakenSchema.findOne({ complaintId: complaint._id }).lean(),
    ]);

    // Prepare the data for the template
    return {
      complaint,
      chat,
      timeline,
      notes,
      resolution,
    };
  }
}

export default new PDFService();
