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

export const stalledBreakDown = async (req, res, next) => {
  try {
    const days = 10;
    const currentCutoffDate = new Date();
    currentCutoffDate.setDate(currentCutoffDate.getDate() - days);

    const previousCutoffDate = new Date();
    previousCutoffDate.setDate(previousCutoffDate.getDate() - days * 2);

    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid company ID");
      error.statusCode = 400;
      throw error;
    }

    const company = await companySchema.findById(id);
    if (!company) {
      const error = new Error("Company not found");
      error.statusCode = 404;
      throw error;
    }

    // Get current period stalled complaints
    const currentStalledComplaints = await complaintSchema.aggregate([
      {
        $match: {
          companyName: company.companyName, // Only complaints for this company
        },
      },
      {
        $lookup: {
          from: "timelinemodels",
          let: { complaintObjId: "$_id" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$complaintId", "$$complaintObjId"] } },
            },
            { $sort: { timestamp: -1 } },
            { $limit: 1 },
          ],
          as: "latestTimeline",
        },
      },
      {
        $addFields: {
          latestTimelineDate: {
            $ifNull: [
              { $arrayElemAt: ["$latestTimeline.timestamp", 0] },
              "$createdAt",
            ],
          },
        },
      },
      {
        $match: {
          $and: [
            { latestTimelineDate: { $lt: currentCutoffDate } },
            {
              $or: [
                { status_of_client: "Pending" },
                { status_of_client: "Pending Authorization" },
                {
                  status_of_client: "In Progress",
                  authorizationStatus: "Pending",
                },
              ],
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          complaintId: 1,
          companyName: 1,
          department: 1,
          complaintMessage: 1,
          status_of_client: 1,
          authorizationStatus: 1,
          createdAt: 1,
          lastUpdated: "$latestTimelineDate",
          daysSinceLastUpdate: {
            $divide: [
              { $subtract: [new Date(), "$latestTimelineDate"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
    ]);

    // Get previous period stalled complaints for comparison
    const previousStalledComplaints = await complaintSchema.aggregate([
      {
        $match: {
          companyName: company.companyName,
        },
      },
      {
        $lookup: {
          from: "timelinemodels",
          let: { complaintObjId: "$_id" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$complaintId", "$$complaintObjId"] } },
            },
            { $sort: { timestamp: -1 } },
            { $limit: 1 },
          ],
          as: "latestTimeline",
        },
      },
      {
        $addFields: {
          latestTimelineDate: {
            $ifNull: [
              { $arrayElemAt: ["$latestTimeline.timestamp", 0] },
              "$createdAt",
            ],
          },
        },
      },
      {
        $match: {
          $and: [
            { latestTimelineDate: { $lt: previousCutoffDate } },
            {
              latestTimelineDate: {
                $gte: new Date(
                  previousCutoffDate.getTime() - days * 24 * 60 * 60 * 1000
                ),
              },
            },
            {
              $or: [
                { status_of_client: "Pending" },
                { status_of_client: "Pending Authorization" },
                {
                  status_of_client: "In Progress",
                  authorizationStatus: "Pending",
                },
              ],
            },
          ],
        },
      },
    ]);

    // Categorize complaints by status
    const categorizeComplaints = (complaints) => {
      const categories = {
        pending: complaints.filter((c) => c.status_of_client === "Pending"),
        pendingAuth: complaints.filter(
          (c) => c.status_of_client === "Pending Authorization"
        ),
        inProgressPending: complaints.filter(
          (c) =>
            c.status_of_client === "In Progress" &&
            c.authorizationStatus === "Pending"
        ),
      };
      return categories;
    };

    const currentCategories = categorizeComplaints(currentStalledComplaints);
    const previousCategories = categorizeComplaints(previousStalledComplaints);

    // Calculate percentages and changes
    const totalCurrent = currentStalledComplaints.length;
    const totalPrevious = previousStalledComplaints.length;

    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const stats = {
      totalStalled: totalCurrent,
      totalStalledChange: calculatePercentageChange(
        totalCurrent,
        totalPrevious
      ),
      categories: {
        pending: {
          count: currentCategories.pending.length,
          percentage:
            totalCurrent > 0
              ? (currentCategories.pending.length / totalCurrent) * 100
              : 0,
          change: calculatePercentageChange(
            currentCategories.pending.length,
            previousCategories.pending.length
          ),
        },
        pendingAuth: {
          count: currentCategories.pendingAuth.length,
          percentage:
            totalCurrent > 0
              ? (currentCategories.pendingAuth.length / totalCurrent) * 100
              : 0,
          change: calculatePercentageChange(
            currentCategories.pendingAuth.length,
            previousCategories.pendingAuth.length
          ),
        },
        inProgressPending: {
          count: currentCategories.inProgressPending.length,
          percentage:
            totalCurrent > 0
              ? (currentCategories.inProgressPending.length / totalCurrent) *
                100
              : 0,
          change: calculatePercentageChange(
            currentCategories.inProgressPending.length,
            previousCategories.inProgressPending.length
          ),
        },
      },
    };

    // Get total active complaints for this company for context
    const totalActiveComplaints = await complaintSchema.countDocuments({
      companyName: company.companyName,
      status_of_client: { $nin: ["Resolved", "Closed", "Rejected"] },
    });

    const stalledPercentageOfTotal =
      totalActiveComplaints > 0
        ? (totalCurrent / totalActiveComplaints) * 100
        : 0;

    const responseData = {
      companyName: company.companyName,
      period: `${days} days`,
      summary: {
        totalStalled: totalCurrent,
        totalActive: totalActiveComplaints,
        stalledPercentageOfTotal:
          Math.round(stalledPercentageOfTotal * 100) / 100,
        changeFromPrevious: Math.round(stats.totalStalledChange * 100) / 100,
      },
      breakdown: {
        pending: {
          count: stats.categories.pending.count,
          percentage:
            Math.round(stats.categories.pending.percentage * 100) / 100,
          change: Math.round(stats.categories.pending.change * 100) / 100,
          description: "Complaints with no initial response or action taken",
        },
        pendingAuthorization: {
          count: stats.categories.pendingAuth.count,
          percentage:
            Math.round(stats.categories.pendingAuth.percentage * 100) / 100,
          change: Math.round(stats.categories.pendingAuth.change * 100) / 100,
          description: "Complaints waiting for authorization to proceed",
        },
        inProgressButStalled: {
          count: stats.categories.inProgressPending.count,
          percentage:
            Math.round(stats.categories.inProgressPending.percentage * 100) /
            100,
          change:
            Math.round(stats.categories.inProgressPending.change * 100) / 100,
          description: "In-progress complaints with pending authorization",
        },
      },
      complaints: currentStalledComplaints.map((complaint) => ({
        ...complaint,
        daysSinceLastUpdate: Math.floor(complaint.daysSinceLastUpdate),
      })),
    };

    return res.status(200).json({
      success: true,
      data: responseData,
      message: `Found ${totalCurrent} complaints stalled for more than ${days} days (${Math.round(stats.totalStalledChange * 100) / 100}% change from previous period)`,
    });
  } catch (error) {
    console.error("Stalled breakdown error:", error);
    next(error);
  }
};

// export const resolutionPattern=async (req,res,next)=>
// {
//   try {
//     const {id}=req.params;
//     if(!id||!mongoose.Types.ObjectId.isValid(id))
//     {
//       const error=new Error("Invalid ID");
//       error.statusCode=400;
//       throw error;
//     }
//     const company=await companySchema.findById(id);
//     if(!company)
//     {
//       const error=new Error("Company not found");
//       error.statusCode=404;
//       throw error;
//     }
//   } catch (error) {

//   }
// }

export const resolutionPattern = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid company ID");
      error.statusCode = 400;
      throw error;
    }

    // Find company
    const company = await companySchema.findById(id);
    if (!company) {
      const error = new Error("Company not found");
      error.statusCode = 404;
      throw error;
    }

    // Get date range for analysis (last 30 days by default)
    const { startDate, endDate } = req.query;
    const dateFilter = {};

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    } else {
      // Default to last 30 days
      dateFilter.createdAt = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      };
    }

    // Aggregate complaint data for resolution patterns
    const resolutionData = await complaintSchema.aggregate([
      {
        $match: {
          companyName: company.companyName,
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: "timelinemodels",
          localField: "timeline",
          foreignField: "_id",
          as: "timelineData",
        },
      },
      {
        $addFields: {
          resolutionTime: {
            $cond: {
              if: { $eq: ["$status_of_client", "Resolved"] },
              then: {
                $subtract: [
                  { $ifNull: ["$updatedAt", new Date()] },
                  "$createdAt",
                ],
              },
              else: null,
            },
          },
          isBreached: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$status_of_client", "Resolved"] },
                  { $ne: ["$status_of_client", "Unwanted"] },
                  {
                    $gt: [
                      { $subtract: [new Date(), "$createdAt"] },
                      { $multiply: [60 * 60 * 1000] },
                    ],
                  },
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalComplaints: { $sum: 1 },
          resolvedComplaints: {
            $sum: {
              $cond: [{ $eq: ["$status_of_client", "Resolved"] }, 1, 0],
            },
          },
          pendingComplaints: {
            $sum: {
              $cond: [{ $eq: ["$status_of_client", "Pending"] }, 1, 0],
            },
          },
          inProgressComplaints: {
            $sum: {
              $cond: [{ $eq: ["$status_of_client", "In Progress"] }, 1, 0],
            },
          },
          breachedComplaints: {
            $sum: {
              $cond: ["$isBreached", 1, 0],
            },
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $ne: ["$resolutionTime", null] },
                "$resolutionTime",
                null,
              ],
            },
          },
          priorityBreakdown: {
            $push: {
              priority: "$priority",
              status: "$status_of_client",
              isBreached: "$isBreached",
              resolutionTime: "$resolutionTime",
            },
          },
        },
      },
    ]);

    // Calculate priority-wise metrics
    const priorityMetrics = await complaintSchema.aggregate([
      {
        $match: {
          companyName: company.companyName,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $eq: ["$status_of_client", "Resolved"] }, 1, 0],
            },
          },
          breached: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status_of_client", "Resolved"] },
                    { $ne: ["$status_of_client", "Unwanted"] },
                    {
                      $gt: [
                        { $subtract: [new Date(), "$createdAt"] },
                        { $multiply: [60 * 60 * 1000] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $eq: ["$status_of_client", "Resolved"] },
                { $subtract: ["$updatedAt", "$createdAt"] },
                null,
              ],
            },
          },
        },
      },
      {
        $addFields: {
          resolutionRate: {
            $multiply: [{ $divide: ["$resolved", "$count"] }, 100],
          },
          breachRate: {
            $multiply: [{ $divide: ["$breached", "$count"] }, 100],
          },
        },
      },
    ]);

    // Department-wise analysis
    const departmentMetrics = await complaintSchema.aggregate([
      {
        $match: {
          companyName: company.companyName,
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $eq: ["$status_of_client", "Resolved"] }, 1, 0],
            },
          },
          avgResolutionTime: {
            $avg: {
              $cond: [
                { $eq: ["$status_of_client", "Resolved"] },
                { $subtract: ["$updatedAt", "$createdAt"] },
                null,
              ],
            },
          },
        },
      },
      {
        $addFields: {
          resolutionRate: {
            $multiply: [{ $divide: ["$resolved", "$count"] }, 100],
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Escalation patterns
    const escalationData = await complaintSchema.aggregate([
      {
        $match: {
          companyName: company.companyName,
          ...dateFilter,
        },
      },
      {
        $lookup: {
          from: "timelinemodels",
          localField: "timeline",
          foreignField: "_id",
          as: "timelineData",
        },
      },
      {
        $addFields: {
          statusChanges: { $size: "$timelineData" },
          hasEscalated: {
            $gt: [{ $size: "$timelineData" }, 2],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalEscalations: {
            $sum: {
              $cond: ["$hasEscalated", 1, 0],
            },
          },
          avgStatusChanges: { $avg: "$statusChanges" },
          escalationsByPriority: {
            $push: {
              $cond: [
                "$hasEscalated",
                { priority: "$priority", department: "$department" },
                null,
              ],
            },
          },
        },
      },
    ]);

    // Format response data
    const responseData = {
      companyInfo: {
        id: company._id,
        name: company.companyName,
        analysisDate: new Date(),
      },
      overallMetrics: {
        totalComplaints: resolutionData[0]?.totalComplaints || 0,
        resolvedComplaints: resolutionData[0]?.resolvedComplaints || 0,
        pendingComplaints: resolutionData[0]?.pendingComplaints || 0,
        inProgressComplaints: resolutionData[0]?.inProgressComplaints || 0,
        breachedComplaints: resolutionData[0]?.breachedComplaints || 0,
        resolutionRate: resolutionData[0]?.totalComplaints
          ? (
              (resolutionData[0].resolvedComplaints /
                resolutionData[0].totalComplaints) *
              100
            ).toFixed(2)
          : 0,
        avgResolutionTimeHours: resolutionData[0]?.avgResolutionTime
          ? (resolutionData[0].avgResolutionTime / (1000 * 60 * 60)).toFixed(2)
          : null,
        breachRate: resolutionData[0]?.totalComplaints
          ? (
              (resolutionData[0].breachedComplaints /
                resolutionData[0].totalComplaints) *
              100
            ).toFixed(2)
          : 0,
      },
      priorityAnalysis: priorityMetrics.map((item) => ({
        priority: item._id,
        totalCount: item.count,
        resolvedCount: item.resolved,
        breachedCount: item.breached,
        resolutionRate: item.resolutionRate?.toFixed(2) || 0,
        breachRate: item.breachRate?.toFixed(2) || 0,
        avgResolutionTimeHours: item.avgResolutionTime
          ? (item.avgResolutionTime / (1000 * 60 * 60)).toFixed(2)
          : null,
      })),
      departmentAnalysis: departmentMetrics.map((item) => ({
        department: item._id,
        totalCount: item.count,
        resolvedCount: item.resolved,
        resolutionRate: item.resolutionRate?.toFixed(2) || 0,
        avgResolutionTimeHours: item.avgResolutionTime
          ? (item.avgResolutionTime / (1000 * 60 * 60)).toFixed(2)
          : null,
      })),
      escalationMetrics: {
        totalEscalations: escalationData[0]?.totalEscalations || 0,
        avgStatusChanges: escalationData[0]?.avgStatusChanges?.toFixed(2) || 0,
        escalationRate: resolutionData[0]?.totalComplaints
          ? (
              ((escalationData[0]?.totalEscalations || 0) /
                resolutionData[0].totalComplaints) *
              100
            ).toFixed(2)
          : 0,
      },
      slaMetrics: {
        targetFirstResponseTime: 0, // hours
        actualAvgFirstResponseTime: 0, // This should be calculated from actual data
        breachThreshold: 0,
        currentBreaches: resolutionData[0]?.breachedComplaints || 0,
      },
    };

    res.status(200).json({
      success: true,
      message: "Resolution pattern analysis completed successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Resolution pattern analysis error:", error);

    // Handle specific error types
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        details: error.message,
      });
    }

    // Handle database connection errors
    if (error.name === "MongoNetworkError") {
      return res.status(503).json({
        success: false,
        message: "Database connection error",
      });
    }

    // Generic error handler
    res.status(500).json({
      success: false,
      message: "Internal server error during resolution pattern analysis",
    });
  }
};

// Additional helper function for real-time breach monitoring
export const getBreachedComplaints = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID",
      });
    }

    const company = await companySchema.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const breachedComplaints = await complaintSchema
      .find({
        companyName: company.companyName,
        status_of_client: { $nin: ["Resolved", "Unwanted"] },
        createdAt: {
          $lt: new Date(Date.now() - 1.4 * 60 * 60 * 1000), // 1.4 hours ago
        },
      })
      .populate("timeline")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: breachedComplaints.length,
      data: breachedComplaints,
    });
  } catch (error) {
    console.error("Breached complaints fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching breached complaints",
    });
  }
};
