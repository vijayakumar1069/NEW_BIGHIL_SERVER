import {
  addDays,
  endOfDay,
  endOfToday,
  format,
  startOfDay,
  startOfToday,
  startOfWeek,
  subDays,
} from "date-fns";
import complaintSchema from "../../schema/complaint.schema.js";
import companySchema from "../../schema/company.schema.js";
import userSchema from "../../schema/user.schema.js";

export const bighilDashBoardStats = async (req, res, next) => {
  try {
    // Get current date
    const now = new Date();

    // Calculate start of the current week (Sunday)
    const weekStart = startOfWeek(now);

    // Calculate start and end of current day
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);

    // Get total complaints count
    const totalComplaints = await complaintSchema.countDocuments();

    // Get this week's complaints count
    const thisWeekComplaints = await complaintSchema.countDocuments({
      createdAt: { $gte: weekStart },
    });

    // Get today's complaints count
    const todayComplaints = await complaintSchema.countDocuments({
      createdAt: { $gte: dayStart, $lte: dayEnd },
    });

    // Get in progress complaints count
    const inProgressComplaints = await complaintSchema.countDocuments({
      status_of_client: "In Progress",
    });

    // Get resolved complaints count
    const resolvedComplaints = await complaintSchema.countDocuments({
      status_of_client: "Resolved",
    });

    // Get unwanted complaints count
    const unwantedComplaints = await complaintSchema.countDocuments({
      status_of_client: "Unwanted",
    });

    // Get critical priority complaints count
    const criticalPriorityComplaints = await complaintSchema.countDocuments({
      priority: "CRITICAL",
    });

    // Get pending complaints count
    const pendingComplaints = await complaintSchema.countDocuments({
      status_of_client: "Pending",
    });

    // Calculate average resolution time (in days) for resolved complaints
    const resolvedComplaintsData = await complaintSchema.find({
      status_of_client: "Resolved",
    });

    let avgResolutionTime = 0;
    if (resolvedComplaintsData.length > 0) {
      const totalResolutionTime = resolvedComplaintsData.reduce(
        (acc, complaint) => {
          const creationDate = new Date(complaint.createdAt);
          const updateDate = new Date(complaint.updatedAt);
          const diffTime = Math.abs(updateDate - creationDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return acc + diffDays;
        },
        0
      );
      avgResolutionTime = totalResolutionTime / resolvedComplaintsData.length;
    }

    // Return the dashboard metrics
    res.status(200).json({
      success: true,
      data: {
        totalComplaints,
        thisWeekComplaints,
        todayComplaints,
        inProgressComplaints,
        resolvedComplaints,
        unwantedComplaints,
        criticalPriorityComplaints,
        pendingComplaints,
        avgResolutionTime: parseFloat(avgResolutionTime.toFixed(1)),
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard metrics",
      error: error.message,
    });
  }
};

export const clientDetailsStats = async (req, res, next) => {
  try {
    const totalClients = await companySchema.countDocuments();

    const topClients = await complaintSchema.aggregate([
      {
        $group: {
          _id: "$companyName",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          count: "$count", // consistent with chart structure
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalClients,
        topClients,
      },
    });
  } catch (error) {
    console.error("Error in clientDetailsStats:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch client statistics",
      error: error.message || "Internal Server Error",
    });
  }
};

export const usersStats = async (req, res, next) => {
  try {
    // 1. Total Users
    const totalUsers = await userSchema.countDocuments();

    // 2. Today's Active Users (using lastActive field)
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const todayActiveUsers = await userSchema.countDocuments({
      lastActive: { $gte: todayStart, $lte: todayEnd },
    });

    // 3. Last 7 Days New Signups
    const last7DaysSignups = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      // Start from 6 days ago up to today
      const dayDate = subDays(today, i);
      const dayStart = startOfDay(dayDate);
      const dayEnd = endOfDay(dayDate);

      const count = await userSchema.countDocuments({
        createdAt: { $gte: dayStart, $lte: dayEnd },
      });

      last7DaysSignups.push({
        Day: format(dayDate, "EEE"),
        Count: count,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        todayActiveUsers,
        last7DaysSignups,
      },
    });
  } catch (error) {
    console.error("Error in usersStats:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
      error: error.message || "Internal Server Error",
    });
  }
};
