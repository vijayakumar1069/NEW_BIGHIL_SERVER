import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";
import mongoose from "mongoose";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import actionTakenSchema from "../../schema/actionTaken.schema.js";

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

export async function getCategoryBreakdown(req, res, next) {
  const { id } = req.params;

  try {
    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid ID");
      error.statusCode = 400;
      throw error;
    }

    // 1. Get company by ID
    const company = await companySchema.findById(id);
    if (!company) {
      const error = new Error("Company not found");
      error.statusCode = 404;
      throw error;
    }

    // 2. Run aggregation to get tag breakdown and total complaints in one go
    const result = await complaintSchema.aggregate([
      { $match: { companyName: company.companyName } },
      {
        $facet: {
          tagCounts: [
            { $unwind: "$tags" },
            { $match: { tags: { $ne: "" } } },
            {
              $group: {
                _id: "$tags",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
          ],
          totalCount: [{ $count: "total" }],
        },
      },
    ]);

    const tags = result[0].tagCounts;
    const totalComplaints = result[0].totalCount[0]?.total || 0;

    // 3. Add percentage calculation for each tag
    const tagsWithPercentages = tags.map((tag) => ({
      tag: tag._id,
      count: tag.count,
      percentage:
        totalComplaints > 0
          ? Number(((tag.count / totalComplaints) * 100).toFixed(2))
          : 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        totalComplaints,
        tags: tagsWithPercentages,
      },
      message: "Category breakdown fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getDepartmentBreakdown(req, res, next) {
  const { id } = req.params;

  try {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid ID");
      error.statusCode = 400;
      throw error;
    }

    const company = await companySchema.findById(id);
    if (!company) {
      const error = new Error("Company not found");
      error.statusCode = 404;
      throw error;
    }

    // 1. Get all complaints for the company
    const complaints = await complaintSchema.find({
      companyName: company.companyName,
    });

    // 2. Group complaints by department
    const departmentMap = new Map();

    for (const complaint of complaints) {
      const dept = complaint.department || "Unknown";
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          department: dept,
          complaints: 0,
          resolvedCount: 0,
          totalResolutionTime: 0, // in days
        });
      }

      const entry = departmentMap.get(dept);
      entry.complaints += 1;

      const isResolved =
        complaint.status_of_client === "Resolved" &&
        complaint.authorizationStatus === "Approved";

      if (isResolved) {
        const resolution = await actionTakenSchema
          .findOne({ complaintId: complaint._id })
          .sort({ updatedAt: -1 });

        if (resolution) {
          const resolutionTimeMs =
            new Date(resolution.updatedAt) - new Date(complaint.createdAt);
          const resolutionTimeDays = resolutionTimeMs / (1000 * 60 * 60 * 24);
          entry.totalResolutionTime += resolutionTimeDays;
          entry.resolvedCount += 1;
        }
      }
    }
    console.log("departmentMap", departmentMap);

    // 3. Format result
    const result = [];

    for (const entry of departmentMap.values()) {
      const resolvedPercentage =
        entry.complaints > 0
          ? Math.round((entry.resolvedCount / entry.complaints) * 100)
          : 0;
      const avgResolutionTime =
        entry.resolvedCount > 0
          ? +(entry.totalResolutionTime / entry.resolvedCount).toFixed(2)
          : 0;

      result.push({
        department: entry.department,
        complaints: entry.complaints,
        resolvedPercentage: `${resolvedPercentage}%`,
        avgResolutionTime: `${avgResolutionTime} days`,
      });
    }

    // 4. Sort by complaint count
    result.sort((a, b) => b.complaints - a.complaints);

    return res.status(200).json({
      success: true,
      data: result,
      message: "Department breakdown fetched successfully",
    });
  } catch (error) {
    next(error);
  }
}
