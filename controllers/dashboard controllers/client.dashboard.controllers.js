import companyAdminSchema from "../../schema/company.admin.schema.js";
import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";
import notificationSchema from "../../schema/notification.schema.js";

// server/controllers/dashboardController.js
export const getDashboardStats = async (req, res, next) => {
  try {
    const { timeframe = "1" } = req.query; // Default to 30 days
    const daysToCompare = parseInt(timeframe);

    // Current date range
    const currentEndDate = new Date();
    const currentStartDate = new Date();
    currentStartDate.setDate(currentStartDate.getDate() - daysToCompare);

    // Previous date range (for comparison)
    const previousEndDate = new Date(currentStartDate);

    previousEndDate.setDate(previousEndDate.getDate() - 1); // Move back one day to ensure no overlap
    const previousStartDate = new Date(previousEndDate);
    // const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - daysToCompare);

    // Get current period counts
    const [
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      unwantedComplaints,
    ] = await Promise.all([
      complaintSchema.countDocuments({
        createdAt: { $gte: currentStartDate, $lte: currentEndDate },
      }),
      complaintSchema.countDocuments({
        status_of_client: "Pending",
        createdAt: { $gte: currentStartDate, $lte: currentEndDate },
      }),
      complaintSchema.countDocuments({
        status_of_client: "In Progress",
        createdAt: { $gte: currentStartDate, $lte: currentEndDate },
      }),
      complaintSchema.countDocuments({
        status_of_client: "Resolved",
        createdAt: { $gte: currentStartDate, $lte: currentEndDate },
      }),
      complaintSchema.countDocuments({
        status_of_client: "Unwanted",
        createdAt: { $gte: currentStartDate, $lte: currentEndDate },
      }),
    ]);

    // Get previous period counts for percentage calculation
    const [
      prevTotalComplaints,
      prevPendingComplaints,
      prevInProgressComplaints,
      prevResolvedComplaints,
      prevUnwantedComplaints,
    ] = await Promise.all([
      complaintSchema.countDocuments({
        createdAt: { $gte: previousStartDate, $lte: previousEndDate },
      }),
      complaintSchema.countDocuments({
        status_of_client: "Pending",
        createdAt: { $gte: previousStartDate, $lte: previousEndDate },
      }),
      complaintSchema.countDocuments({
        status_of_client: "In Progress",
        createdAt: { $gte: previousStartDate, $lte: previousEndDate },
      }),
      complaintSchema.countDocuments({
        status_of_client: "Resolved",
        createdAt: { $gte: previousStartDate, $lte: previousEndDate },
      }),
      complaintSchema.countDocuments({
        status_of_client: "Unwanted",
        createdAt: { $gte: previousStartDate, $lte: previousEndDate },
      }),
    ]);

    // Calculate percentage changes
    const calculatePercentage = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const stats = {
      total: {
        count: totalComplaints,
        percentage: calculatePercentage(totalComplaints, prevTotalComplaints),
        trend: totalComplaints >= prevTotalComplaints ? "up" : "down",
      },
      pending: {
        count: pendingComplaints,
        percentage: calculatePercentage(
          pendingComplaints,
          prevPendingComplaints
        ),
        trend: pendingComplaints >= prevPendingComplaints ? "up" : "down",
      },
      inProgress: {
        count: inProgressComplaints,
        percentage: calculatePercentage(
          inProgressComplaints,
          prevInProgressComplaints
        ),
        trend: inProgressComplaints >= prevInProgressComplaints ? "up" : "down",
      },
      resolved: {
        count: resolvedComplaints,
        percentage: calculatePercentage(
          resolvedComplaints,
          prevResolvedComplaints
        ),
        trend: resolvedComplaints >= prevResolvedComplaints ? "up" : "down",
      },
      unwanted: {
        count: unwantedComplaints,
        percentage: calculatePercentage(
          unwantedComplaints,
          prevUnwantedComplaints
        ),
        trend: unwantedComplaints >= prevUnwantedComplaints ? "up" : "down",
      },
    };

    res.status(200).json({
      success: true,
      data: stats,
      message: "Dashboard stats retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getComplaintsTimeline = async (req, res, next) => {
  try {
    const { timeframe = "7" } = req.query; // Default to 7 days
    const daysToFetch = parseInt(timeframe);

    // Calculate the date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToFetch);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate complaints by creation date (ignoring status)
    const complaintsByDay = await complaintSchema.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    // Generate all dates in the range
    const formattedData = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split("T")[0];

      // Find data for this date
      const complaintsData = complaintsByDay.find(
        (day) => day._id.date === dateString
      );

      formattedData.push({
        date: dateString,
        totalComplaints: complaintsData ? complaintsData.count : 0,
      });

      // Move to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.status(200).json({
      success: true,
      data: {
        timeline: formattedData,
      },
      message: "Complaint timeline data retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
};

export async function getRecentComplaints(req, res, next) {
  try {
    const adminId = await companyAdminSchema.findById(req.user.id);
    const getCompanyName = await companySchema.findById(adminId.companyId);

    const recent_Complaints = await complaintSchema
      .find({ companyName: getCompanyName.companyName })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "complaintId companyName complaintAgainst complaintMessage createdAt status_of_client priority"
      );
    if (!recent_Complaints) {
      const error = new Error("No recent complaints found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      data: recent_Complaints,
      message: "Recent complaints retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecentNotifications(req, res, next) {
  try {
    const userId = req.user.id;

    // Fetch notifications with pagination
    const notifications = await notificationSchema
      .find({ "recipients.user": userId })
      .sort("-createdAt")

      .limit(5);

    if (!notifications) {
      const error = new Error("No notifications found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: "Fetched complaints successfully",
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
}

export async function getKeywordsCharts(req, res, next) {
  try {
    const adminId = await companyAdminSchema.findById(req.user.id);
    const getCompanyName = await companySchema.findById(adminId.companyId);
    const recent_Complaints = await complaintSchema.find({
      companyName: getCompanyName.companyName,
    });

    // Count tag occurrences (excluding empty strings)
    const tagCounts = {};
    let validTagsTotal = 0;

    recent_Complaints.forEach((complaint) => {
      complaint.tags.forEach((tag) => {
        if (tag && tag.trim()) {
          // Skip empty or whitespace-only tags
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          validTagsTotal++;
        }
      });
    });

    // Convert to array and sort by count
    let sortedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({
        name: tag,
        value: count,
        percentage: ((count / validTagsTotal) * 100).toFixed(1),
      }))
      .sort((a, b) => b.value - a.value);

    // Get top 4 tags and combine the rest
    const top4Tags = sortedTags.slice(0, 4);
    const otherTags = sortedTags.slice(4);

    // Calculate "Others" total if there are more than 4 tags
    if (otherTags.length > 0) {
      const othersValue = otherTags.reduce((sum, tag) => sum + tag.value, 0);
      const othersPercentage = ((othersValue / validTagsTotal) * 100).toFixed(
        1
      );

      top4Tags.push({
        name: "Others",
        value: othersValue,
        percentage: othersPercentage,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        totalComplaints: recent_Complaints.length,
        tagStats: top4Tags,
      },
      message: "Keywords chart data retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function getMaximumComplaintsAgainst(req, res, next) {
  try {
    const adminId = await companyAdminSchema.findById(req.user.id);
    const getCompanyName = await companySchema.findById(adminId.companyId);

    // First, get total complaints count
    const totalComplaints = await complaintSchema.countDocuments({
      companyName: getCompanyName.companyName,
    });

    // Get all departments sorted by complaint count
    const allDepartments = await complaintSchema.aggregate([
      {
        $match: {
          companyName: getCompanyName.companyName,
        },
      },
      {
        $group: {
          _id: "$complaintAgainst",
          count: { $sum: 1 },
        },
      },
      {
        $addFields: {
          percentage: {
            $multiply: [{ $divide: ["$count", totalComplaints] }, 100],
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    // Separate top 4 and calculate others
    const top4 = allDepartments.slice(0, 4);
    const remainingDepartments = allDepartments.slice(4);

    // Calculate others total
    const othersData =
      remainingDepartments.length > 0
        ? {
            _id: "Others",
            count: remainingDepartments.reduce(
              (sum, dept) => sum + dept.count,
              0
            ),
            percentage: remainingDepartments.reduce(
              (sum, dept) => sum + dept.percentage,
              0
            ),
          }
        : null;

    // Combine top 4 and others
    const finalData = othersData ? [...top4, othersData] : top4;

    // Format percentages to 1 decimal place
    const formattedData = finalData.map((item) => ({
      ...item,
      percentage: Number(item.percentage.toFixed(1)),
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      message: "Maximum complaints against retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}
