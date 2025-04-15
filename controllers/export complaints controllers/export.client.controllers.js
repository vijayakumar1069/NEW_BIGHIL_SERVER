import complaintSchema from "../../schema/complaint.schema.js";
import { convertToCSV } from "../../utils/exportUtils.js";

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
