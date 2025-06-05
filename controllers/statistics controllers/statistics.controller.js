import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";
import mongoose from "mongoose";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export async function getClientSummary(req, res, next) {
  const { id } = req.params;
  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid ID");
      error.statusCode = 400;
      throw error;
    }

    // 1. Get company info
    const company = await companySchema.findById(id);
    if (!company) {
      const error = new Error("Company not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Get total complaints
    const totalComplaints = await complaintSchema.countDocuments({
      companyName: company.companyName,
    });

    // 3. Get first complaint date
    const firstComplaint = await complaintSchema
      .findOne({ companyName: company.companyName })
      .sort({ createdAt: 1 })
      .select("createdAt");

    // 4. Calculate average resolution time (in days) - CORRECTED
    const resolutionStats = await complaintSchema.aggregate([
      {
        $match: {
          companyName: company.companyName,
          status_of_client: "Resolved",
        },
      },
      {
        $addFields: {
          // Calculate resolution duration in milliseconds
          resolutionDuration: {
            $subtract: ["$updatedAt", "$createdAt"],
          },
        },
      },
      {
        $group: {
          _id: null,
          // Convert to days and calculate average
          avgResolution: {
            $avg: {
              $divide: [
                "$resolutionDuration",
                1000 * 60 * 60 * 24, // milliseconds to days
              ],
            },
          },
        },
      },
    ]);

    // 5. Get highest tags category - CORRECTED
    const categoryStats = await complaintSchema.aggregate([
      { $match: { companyName: company.companyName } },
      { $unwind: "$tags" }, // Unwind the tags array
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    // 6. Get active departments
    const departmentStats = await complaintSchema.aggregate([
      { $match: { companyName: company.companyName } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    // Format the response
    res.status(200).json({
      success: true,
      data: {
        "Company Name": company.companyName,
        "Total Complaints Filed": totalComplaints,
        "First Complaint Date": firstComplaint
          ? new Date(firstComplaint.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "N/A",
        "Avg. Resolution Time":
          resolutionStats.length > 0 && resolutionStats[0].avgResolution
            ? `${resolutionStats[0].avgResolution.toFixed(1)} Days`
            : "N/A",
        "Highest Complaint Category": categoryStats.length
          ? categoryStats[0]._id
          : "N/A",
        "Active Departments": departmentStats.length
          ? departmentStats.map((dept) => dept._id).join(", ")
          : "N/A",
      },
      message: "Client Summary fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getMonthlyTrends(req, res, next) {
  const { id } = req.params;
  const { fromDate, toDate } = req.query;

  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid ID");
      error.statusCode = 400;
      throw error;
    }

    // 1. Get company info
    const company = await companySchema.findById(id);
    if (!company) {
      const error = new Error("Company not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Determine date range
    let startDate, endDate;
    if (fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
    } else {
      endDate = new Date();
      startDate = subMonths(endDate, 5); // Last 6 months
    }

    // 3. Generate month buckets
    const months = [];
    let current = startOfMonth(startDate);

    while (current <= endDate) {
      months.push({
        start: new Date(current),
        end: endOfMonth(current),
        name: format(current, "MMMM yyyy"),
      });
      current = startOfMonth(
        new Date(current).setMonth(current.getMonth() + 1)
      );
    }

    // 4. Get data for each month
    const monthlyData = await Promise.all(
      months.map(async (month) => {
        const matchStage = {
          companyName: company.companyName,
          createdAt: { $gte: month.start, $lte: month.end },
        };

        const data = await complaintSchema.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              totalComplaint: { $sum: 1 },
              pendingCount: {
                $sum: {
                  $cond: [{ $eq: ["$status_of_client", "Pending"] }, 1, 0],
                },
              },
              inProgressCount: {
                $sum: {
                  $cond: [{ $eq: ["$status_of_client", "In Progress"] }, 1, 0],
                },
              },
              unwantedCount: {
                $sum: {
                  $cond: [{ $eq: ["$status_of_client", "Unwanted"] }, 1, 0],
                },
              },
              resolvedCount: {
                $sum: {
                  $cond: [{ $eq: ["$status_of_client", "Resolved"] }, 1, 0],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              totalComplaint: 1,
              pendingCount: 1,
              inProgressCount: 1,
              unwantedCount: 1,
              resolvedCount: 1,
              resolvedPercentage: {
                $cond: [
                  { $eq: ["$totalComplaint", 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ["$resolvedCount", "$totalComplaint"] },
                      100,
                    ],
                  },
                ],
              },
            },
          },
        ]);

        return {
          month: month.name,
          ...(data[0] || {
            totalComplaint: 0,
            pendingCount: 0,
            inProgressCount: 0,
            unwantedCount: 0,
            resolvedCount: 0,
            resolvedPercentage: 0,
          }),
        };
      })
    );

    // 5. Format the response
    res.status(200).json({
      success: true,
      data: monthlyData,
      message: "Monthly trends fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}
