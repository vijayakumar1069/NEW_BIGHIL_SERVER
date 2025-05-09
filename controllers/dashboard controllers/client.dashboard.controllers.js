import companyAdminSchema from "../../schema/company.admin.schema.js";
import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";
import notificationSchema from "../../schema/notification.schema.js";

import { subDays, startOfDay, endOfDay, isBefore } from "date-fns";

export const getDashboardStats = async (req, res, next) => {
  try {
    const { timeframe = "1" } = req.query;
    const daysToCompare = parseInt(timeframe);

    // Validate timeframe
    if (isNaN(daysToCompare) || daysToCompare < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid timeframe parameter",
      });
    }

    const currentAdmin = await companyAdminSchema.findById(req.user.id);
    const currentCompany = await companySchema.findById(currentAdmin.companyId);

    // Date calculations using date-fns
    const now = new Date();

    // Current period
    const currentStart = startOfDay(subDays(now, daysToCompare));
    const currentEnd = endOfDay(now);

    // Previous period
    const previousEnd = endOfDay(subDays(currentStart, 1));
    const previousStart = startOfDay(subDays(previousEnd, daysToCompare - 1));

    // Validate date order
    if (isBefore(previousEnd, previousStart)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range calculation",
      });
    }

    // Helper function to calculate stats
    const getCounts = async (startDate, endDate) => {
      const filter = {
        companyName: currentCompany.companyName,
        createdAt: { $gte: startDate, $lte: endDate },
      };

      return {
        total: await complaintSchema.countDocuments(filter),
        pending: await complaintSchema.countDocuments({
          ...filter,
          status_of_client: "Pending",
        }),
        inProgress: await complaintSchema.countDocuments({
          ...filter,
          status_of_client: "In Progress",
        }),
        resolved: await complaintSchema.countDocuments({
          ...filter,
          status_of_client: "Resolved",
        }),
        unwanted: await complaintSchema.countDocuments({
          ...filter,
          status_of_client: "Unwanted",
        }),
      };
    };

    // Get counts for both periods
    const [current, previous] = await Promise.all([
      getCounts(currentStart, currentEnd),
      getCounts(previousStart, previousEnd),
    ]);

    // Trend calculation helper
    const calculateTrend = (currentCount, previousCount) => {
      if (previousCount === 0) {
        return currentCount > 0 ? "new" : "same";
      }
      return currentCount > previousCount
        ? "up"
        : currentCount < previousCount
          ? "down"
          : "same";
    };

    // Percentage calculation helper
    const calculatePercentage = (currentCount, previousCount) => {
      if (previousCount === 0) {
        return currentCount > 0 ? 100 : 0;
      }
      return Number(
        (((currentCount - previousCount) / previousCount) * 100).toFixed(1)
      );
    };

    // Build stats object
    const stats = {
      total: {
        count: current.total,
        percentage: calculatePercentage(current.total, previous.total),
        trend: calculateTrend(current.total, previous.total),
      },
      pending: {
        count: current.pending,
        percentage: calculatePercentage(current.pending, previous.pending),
        trend: calculateTrend(current.pending, previous.pending),
      },
      inProgress: {
        count: current.inProgress,
        percentage: calculatePercentage(
          current.inProgress,
          previous.inProgress
        ),
        trend: calculateTrend(current.inProgress, previous.inProgress),
      },
      resolved: {
        count: current.resolved,
        percentage: calculatePercentage(current.resolved, previous.resolved),
        trend: calculateTrend(current.resolved, previous.resolved),
      },
      unwanted: {
        count: current.unwanted,
        percentage: calculatePercentage(current.unwanted, previous.unwanted),
        trend: calculateTrend(current.unwanted, previous.unwanted),
      },
      timeframe: daysToCompare,
      dateRange: {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd },
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
