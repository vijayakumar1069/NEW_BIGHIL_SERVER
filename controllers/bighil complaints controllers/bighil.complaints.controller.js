import mongoose from "mongoose";
import complaintSchema from "../../schema/complaint.schema.js";

export async function getAllComplaintForBighil(req, res, next) {
  try {
    // Extract filter parameters from query
    const {
      complaintId,
      status,
      companyName,
      day,
      month,
      year,
      page = 1,
      limit = 10, // Default to 10 for regular pagination
    } = req.query;

    // Check if any search filters are present
    const isSearching = !!(
      complaintId ||
      status ||
      day ||
      month ||
      year ||
      companyName
    );
    console.log(
      "Search filters applied:",
      complaintId,
      status,
      companyName,
      day,
      month,
      year
    );
    // Build the filter object
    const filter = {};

    // Apply other filters
    if (complaintId) {
      filter.complaintId = { $regex: complaintId, $options: "i" };
    }

    if (status) {
      filter.status_of_client = status;
    }
    if (companyName) {
      filter.companyName = { $regex: companyName, $options: "i" };
    }
    // Handle date filtering
    if (year) {
      const dateFilter = {};

      // Validate year
      const yearInt = parseInt(year, 10);
      if (isNaN(yearInt) || yearInt < 1900 || yearInt > 2100) {
        const error = new Error("Invalid year provided");
        error.status = 400;
        throw error;
      }

      if (month && day) {
        // Validate month and day
        const monthInt = parseInt(month, 10);
        const dayInt = parseInt(day, 10);

        if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
          const error = new Error("Invalid month provided");
          error.status = 400;
          throw error;
        }

        if (isNaN(dayInt) || dayInt < 1 || dayInt > 31) {
          const error = new Error("Invalid day provided");
          error.status = 400;
          throw error;
        }

        // Create dates for specific day
        const startDate = new Date(yearInt, monthInt - 1, dayInt, 0, 0, 0, 0);
        const endDate = new Date(
          yearInt,
          monthInt - 1,
          dayInt,
          23,
          59,
          59,
          999
        );

        // Validate created dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          const error = new Error("Invalid date combination provided");
          error.status = 400;
          throw error;
        }

        dateFilter.$gte = startDate;
        dateFilter.$lte = endDate;
      } else if (month) {
        // Validate month
        const monthInt = parseInt(month, 10);
        if (isNaN(monthInt) || monthInt < 1 || monthInt > 12) {
          const error = new Error("Invalid month provided");
          error.status = 400;
          throw error;
        }

        // Create dates for entire month
        const startDate = new Date(yearInt, monthInt - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(yearInt, monthInt, 0, 23, 59, 59, 999);

        dateFilter.$gte = startDate;
        dateFilter.$lte = endDate;
      } else {
        // Create dates for entire year
        const startDate = new Date(yearInt, 0, 1, 0, 0, 0, 0);
        const endDate = new Date(yearInt, 11, 31, 23, 59, 59, 999);

        dateFilter.$gte = startDate;
        dateFilter.$lte = endDate;
      }

      filter.createdAt = dateFilter;
    }

    // Calculate pagination values
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Get total count first
    const totalCount = await complaintSchema.countDocuments(filter);
    console.log(filter, "Filter used for counting complaints");

    // Prepare the query
    let query = complaintSchema.find(filter).sort({ createdAt: -1 });

    // Skip pagination if searching by specific filters, otherwise apply pagination
    if (!isSearching) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }

    // Execute the query
    const complaints = await query;

    if (!complaints || complaints.length === 0) {
      if (totalCount === 0) {
        return res.status(200).json({
          success: true,
          message: "No complaints found matching criteria",
          data: {
            total: 0,
            complaints: [],
            currentPage: pageNum,
            totalPages: 0,
            limit: limitNum,
            hasNextPage: false,
            hasPreviousPage: false,
            isFilteredSearch: isSearching,
          },
        });
      } else {
        const error = new Error("No complaints found matching filters");
        error.status = 404; // Or maybe 500 if count > 0 but results 0? Keep 404 for now based on original.
        throw error;
      }
    }

    // If searching, use the actual results count for pagination calculations
    // This ensures the frontend knows we're returning all results at once
    const effectiveLimit = isSearching ? complaints.length : limitNum;
    const effectiveTotalPages = isSearching
      ? 1
      : Math.ceil(totalCount / limitNum);

    let returnData = {
      success: true,
      total: totalCount,
      complaints,
      currentPage: pageNum, // When searching, treat as page 1
      totalPages: effectiveTotalPages,
      limit: effectiveLimit,
      hasNextPage: isSearching
        ? false
        : pageNum < Math.ceil(totalCount / limitNum),
      hasPreviousPage: isSearching ? false : pageNum > 1,
      isFilteredSearch: isSearching,
    };

    res.status(200).json({
      success: true,
      message: "Fetched complaints successfully",
      data: returnData,
    });
  } catch (error) {
    console.error("Error filtering complaints:", error);
    next(error);
  }
}

export async function getParticularComplaintForBighil(req, res, next) {
  try {
    const { complaintId } = req.params;

    // Check for valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(complaintId)) {
      const error = new Error("Invalid Complaint ID format.");
      error.statusCode = 400;
      throw error;
    }

    const complaint = await complaintSchema
      .findById(complaintId)
      .populate([
        {
          path: "notes",
          select: "complaintNote addedBy createdAt",
          options: { sort: { createdAt: -1 } },
        },
        {
          path: "timeline",
          select: "status_of_client changedBy timestamp message visibleToUser",
          options: { sort: { timestamp: -1 } },
        },
        { path: "actionMessage", select: "resolutionNote acknowledgements" },
        { path: "chats", select: "unseenCounts" },
      ])
      .select("-__v");

    if (!complaint) {
      const error = new Error("Complaint not found.");
      error.statusCode = 404;
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: { complaint },
      message: "Fetched complaint successfully",
    });
  } catch (error) {
    next(error);
  }
}
