import complaintSchema from "../../schema/complaint.schema.js";
import { Parser } from "json2csv";
import { convertToCSV } from "../../utils/exportUtils.js";
import PDFDocument from "pdfkit-table";
import fs from "fs";
import path from "path";
export async function exportComplaintsForClients(req, res, next) {
  try {
    const { complaintId, status, companyName, day, month, year } = req.query;
    let filter = {};

    if (complaintId) {
      filter.complaintId = complaintId;
    }
    if (status && status !== "all") {
      filter.status_of_client = status;
    }
    if (companyName) {
      filter.companyName = companyName;
    }
    // Date filtering example:
    if (day) {
      // Assume day is in format YYYY-MM-DD
      const start = new Date(day);
      const end = new Date(day);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    } else if (month && year) {
      // For month filtering
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      filter.createdAt = { $gte: start, $lt: end };
    } else if (year) {
      // For year filtering
      const start = new Date(year, 0, 1);
      const end = new Date(Number(year) + 1, 0, 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    const complaints = await complaintSchema.find(filter).lean();
    console.log("Complaints to export:", complaints.length);

    if (!complaints.length) {
      return res.status(404).send("No complaints found to export.");
    }

    const csvData = convertToCSV(complaints);
    res.header("Content-Type", "text/csv");
    res.attachment("complaints-export.csv");
    return res.send(csvData);
  } catch (error) {
    console.error("Error exporting complaints:", error);
    res.status(500).send("Server error while exporting complaints.");
  }
}

export async function exportComplaintPdfForClient(req, res, next) {
  try {
    const complaint = await complaintSchema
      .findById(req.params.id)
      .populate("timeline")
      .populate("notes")
      .populate("actionMessage")
      .populate("chats")
      .select("-userID -__v -updatedAt")
      .lean();

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Create a PDF document with optimized margins
    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      bufferPages: true,
      autoFirstPage: false,
    });

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="complaint-${complaint.complaintId}.pdf"`
    );

    // Define a modern color palette
    const colors = {
      primary: "#1e40af", // Deep blue
      secondary: "#3b82f6", // Medium blue
      accent: "#bfdbfe", // Light blue
      text: "#1e293b", // Dark slate
      muted: "#64748b", // Slate
      warning: "#b45309", // Amber
      danger: "#b91c1c", // Red
      info: "#0e7490", // Cyan
      background: "#f8fafc", // Very light gray
    };

    // Header & footer functions (simple text only)
    const addHeader = () => {
      doc
        .fontSize(9)
        .fillColor(colors.muted)
        .text(`Complaint ID: ${complaint.complaintId}`, 40, 20, {
          align: "left",
        });
    };

    const addFooter = () => {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(9)
          .fillColor(colors.muted)
          .text(
            `Generated on: ${new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })} • Page ${i + 1} of ${range.count}`,
            40,
            doc.page.height - 30,
            { align: "center", width: doc.page.width - 80 }
          );
      }
    };

    // Section heading with a subtle divider
    const addSectionHeading = (title) => {
      doc.moveDown(0.5);
      doc
        .fillColor(colors.primary)
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(title);
      doc.moveDown(0.3);
      doc
        .fillColor(colors.accent)
        .lineWidth(1)
        .moveTo(40, doc.y)
        .lineTo(doc.page.width - 40, doc.y)
        .stroke();
      doc.moveDown(0.5);
    };

    // Instead of drawing borders around sections, use a flat background fill
    const addSectionBox = (callback) => {
      const startY = doc.y;
      doc.save();
      const startPos = doc.y;
      callback(true); // dry run to calculate height
      const endPos = doc.y;
      doc.restore();
      // Draw a subtle background rectangle without an outline
      doc
        .rect(40, startY - 5, doc.page.width - 80, endPos - startPos + 10)
        .fill(colors.background);
      doc.y = startY;
      callback(false);
      doc.moveDown(0.5);
    };

    // --------------------------
    // COVER PAGE (Attractive Design)
    // --------------------------
    doc.addPage();

    doc.moveDown(4);
    doc
      .fontSize(28)
      .fillColor(colors.primary)
      .font("Helvetica-Bold")
      .text("COMPLAINT REPORT", { align: "center" });
    doc.moveDown(1);
    doc
      .fontSize(14)
      .fillColor(colors.text)
      .font("Helvetica")
      .text(`Complaint ID: ${complaint.complaintId}`, { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(16)
      .fillColor(colors.secondary)
      .font("Helvetica-Bold")
      .text(complaint.companyName, { align: "center" });
    doc.moveDown(1.5);

    // Status Display: Use a flat colored rectangle without border
    const statusColors = {
      Pending: colors.warning,
      "In Progress": colors.info,
      Resolved: colors.info,
      Unwanted: colors.danger,
    };
    const statusColor =
      statusColors[complaint.status_of_client] || colors.muted;
    doc.rect(doc.page.width / 2 - 50, doc.y, 100, 30).fill(statusColor);
    doc
      .fillColor("#ffffff")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(complaint.status_of_client, doc.page.width / 2 - 50, doc.y + 8, {
        width: 100,
        align: "center",
      });
    doc.moveDown(2);

    // --------------------------
    // MAIN CONTENT
    // --------------------------
    doc.addPage();
    addHeader();

    // Complaint Information Section
    addSectionHeading("Complaint Information");
    addSectionBox((dryRun) => {
      const colWidth = (doc.page.width - 100) / 3;
      let col = 0;
      let rowY = doc.y;
      const infoFields = [
        ["Company", complaint.companyName],
        ["Priority", complaint.priority],
        [
          "Created",
          new Date(complaint.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        ],
        ["Status", complaint.status_of_client],
        ["Tags", complaint.tags ? complaint.tags.join(", ") : "None"],
        ["Timeline Events", complaint.timeline ? complaint.timeline.length : 0],
      ];

      infoFields.forEach(([label, value]) => {
        const xPos = 50 + col * colWidth;
        doc
          .fontSize(10)
          .fillColor(colors.primary)
          .font("Helvetica-Bold")
          .text(label + ":", xPos, rowY, { width: colWidth - 10 });
        doc
          .fillColor(colors.text)
          .font("Helvetica")
          .text(value, xPos, rowY + 10, { width: colWidth - 10 });
        col++;
        if (col === 3) {
          col = 0;
          rowY = doc.y + 10;
        }
      });
      doc.y = rowY + 10;
      // Full-width field for Complaint Against
      doc
        .fontSize(10)
        .fillColor(colors.primary)
        .font("Helvetica-Bold")
        .text("Complaint Against:", 50, doc.y);
      doc.moveDown(0.2);
      doc
        .fillColor(colors.text)
        .font("Helvetica")
        .text(complaint.complaintAgainst, {
          width: doc.page.width - 100,
        });
      doc.moveDown(0.5);
    });

    // Complaint Message Section
    addSectionHeading("Complaint Message");
    addSectionBox(() => {
      doc
        .fillColor(colors.text)
        .fontSize(10)
        .text(complaint.complaintMessage, {
          width: doc.page.width - 100,
          align: "justify",
        });
    });

    // Evidence Files Section (if available)
    if (complaint.evidence && complaint.evidence.length > 0) {
      addSectionHeading("Evidence Files");
      addSectionBox(() => {
        const evidenceTable = {
          headers: ["File Name", "Type"],
          rows: complaint.evidence.map((file) => [
            file.fileName,
            file.fileName.split(".").pop().toUpperCase(),
          ]),
        };
        if (doc.table) {
          doc.table(evidenceTable, {
            prepareHeader: () => {
              doc
                .font("Helvetica-Bold")
                .fontSize(10)
                .fillColor(colors.secondary);
            },
            prepareRow: () => {
              doc.font("Helvetica").fontSize(9).fillColor(colors.text);
            },
            padding: 5,
          });
        } else {
          evidenceTable.headers.forEach((header) => {
            doc.font("Helvetica-Bold").text(header + "\t", { continued: true });
          });
          doc.text("");
          evidenceTable.rows.forEach((row) => {
            row.forEach((cell) => {
              doc.font("Helvetica").text(cell + "\t", { continued: true });
            });
            doc.text("");
          });
        }
      });
    }

    // Resolution Section (if available)
    if (complaint.actionMessage) {
      addSectionHeading("Resolution");
      addSectionBox(() => {
        doc
          .fontSize(11)
          .fillColor(colors.primary)
          .font("Helvetica-Bold")
          .text("Action Taken:");
        doc.moveDown(0.2);
        doc
          .fillColor(colors.text)
          .font("Helvetica")
          .fontSize(10)
          .text(
            complaint.actionMessage.resolutionNote ||
              "No resolution message provided."
          );
        doc.moveDown(0.5);
        doc
          .fontSize(11)
          .fillColor(colors.primary)
          .font("Helvetica-Bold")
          .text("Acknowledgement:");
        doc.moveDown(0.2);
        doc
          .fillColor(colors.text)
          .font("Helvetica")
          .fontSize(10)
          .text(
            complaint.actionMessage.acknowledgements ||
              "No acknowledgement provided."
          );
      });
    }

    // Timeline Section
    if (complaint.timeline && complaint.timeline.length > 0) {
      addSectionHeading("Case Timeline");
      complaint.timeline.forEach((event) => {
        // Render timeline events in a compact format without forcing a page break
        doc
          .fillColor(colors.primary)
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(event.title, { continued: true });
        doc
          .fillColor(colors.muted)
          .fontSize(8)
          .font("Helvetica")
          .text(
            ` — ${new Date(event.date || event.timestamp).toLocaleString()}`
          );
        doc.moveDown(0.2);
        doc
          .fillColor(colors.text)
          .fontSize(9)
          .text(event.message || "No description provided.", {
            width: doc.page.width - 100,
            align: "left",
          });
        doc.moveDown(0.5);
      });
    }

    // Communication History Section (Chat Messages)
    if (
      complaint.chats &&
      complaint.chats.messages &&
      complaint.chats.messages.length > 0
    ) {
      addSectionHeading("Communication History");
      // A brief note on timestamps
      doc
        .fontSize(8)
        .fillColor(colors.muted)
        .text("All timestamps are in local timezone", { align: "right" })
        .moveDown(0.3);

      // Group messages by sender
      const messages = complaint.chats.messages;
      const messageGroups = [];
      let currentGroup = [];

      messages.forEach((msg, i) => {
        if (
          currentGroup.length === 0 ||
          currentGroup[currentGroup.length - 1].sender === msg.sender
        ) {
          currentGroup.push(msg);
        } else {
          messageGroups.push(currentGroup);
          currentGroup = [msg];
        }
        if (i === messages.length - 1) {
          messageGroups.push(currentGroup);
        }
      });

      // Render each message group with a compact layout
      messageGroups.forEach((group) => {
        if (!group.length) return;
        let displayName;
        switch (group[0].sender) {
          case "user":
            displayName = "USER";
            break;
          case "SUPER ADMIN":
            displayName = "Super Admin";
            break;
          case "ADMIN":
            displayName = "Admin";
            break;
          case "SUB ADMIN":
            displayName = "Sub Admin";
            break;
          default:
            displayName = "Unknown";
        }
        // Render sender header
        doc
          .fillColor(colors.primary)
          .fontSize(9)
          .font("Helvetica-Bold")
          .text(displayName, { continued: true, width: 400 });
        doc
          .fillColor(colors.muted)
          .font("Helvetica")
          .fontSize(8)
          .text(` — ${new Date(group[0].createdAt).toLocaleString()}`);
        doc.moveDown(0.3);
        // Render messages in the group
        group.forEach((msg, idx) => {
          // For subsequent messages, show a smaller timestamp
          if (idx > 0) {
            doc
              .fontSize(7)
              .fillColor(colors.muted)
              .text(new Date(msg.createdAt).toLocaleString(), {
                align: "right",
              });
          }
          // Render message content without forcing a page break unnecessarily.
          const msgOptions = {
            width: doc.page.width - 120,
            align: "left",
          };
          // Instead of drawing a full bubble, we use a subtle background fill for the message block.
          const currentY = doc.y;
          const textHeight = doc.heightOfString(msg.content, msgOptions);
          doc
            .rect(55, currentY - 2, doc.page.width - 110, textHeight + 4)
            .fill(colors.background);
          doc
            .fillColor(colors.text)
            .fontSize(9)
            .text(msg.content, 60, currentY, msgOptions);
          doc.moveDown(0.3);
        });
        doc.moveDown(0.5);
      });
    }

    // Add footers on all pages
    // addFooter();

    // Finalize the PDF and send the response
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error);
    res
      .status(500)
      .json({ message: "PDF generation failed", error: error.message });
  }
}
