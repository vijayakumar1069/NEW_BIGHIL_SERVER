import { endOfDay, startOfDay, startOfWeek } from "date-fns";
import complaintSchema from "../../schema/complaint.schema.js";

export const bighilDashBoardStats = async (req, res, next) => {
  try {
    console.log("Bighil Dashboard Stats");
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
