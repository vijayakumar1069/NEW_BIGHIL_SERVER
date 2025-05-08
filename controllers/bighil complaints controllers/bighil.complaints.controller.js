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

      if (month && day) {
        // Specific day filter
        const startDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
        const endDate = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
        dateFilter.$gte = startDate;
        dateFilter.$lte = endDate;
      } else if (month) {
        // Month filter
        const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
        const lastDay = new Date(year, parseInt(month, 10), 0).getDate();
        const endDate = new Date(`${year}-${month}-${lastDay}T23:59:59.999Z`);
        dateFilter.$gte = startDate;
        dateFilter.$lte = endDate;
      } else {
        // Year filter
        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
        dateFilter.$gte = startDate;
        dateFilter.$lte = endDate;
      }

      // Add date filter to main filter
      filter.createdAt = dateFilter;
    }

    // Calculate pagination values
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Get total count first
    const totalCount = await complaintSchema.countDocuments(filter);

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
      const error = new Error("No complaints found");
      error.status = 404;
      throw error;
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
          select: "status_of_client changedBy timestamp message",
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
