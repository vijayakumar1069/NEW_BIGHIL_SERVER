import companyAdminSchema from "../../schema/company.admin.schema.js";
import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";

export const clientComplaintFilters = async (req, res, next) => {
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

    // Get company information
    const adminId = req.user.id;
    const companyAdmin = await companyAdminSchema.findById(adminId);
    if (!companyAdmin) {
      const error = new Error("Company admin not found");
      error.status = 404;
      throw error;
    }

    const getCompanyId = await companySchema.findById(companyAdmin.companyId);
    if (!getCompanyId) {
      const error = new Error("Company not found");
      error.status = 404;
      throw error;
    }
    const getCompanyName = getCompanyId.companyName;

    // Build the filter object
    const filter = {
      companyName: getCompanyName,
    };

    // Apply other filters`
    if (complaintId) {
      filter.complaintId = { $regex: complaintId, $options: "i" };
    }

    if (status) {
      filter.status_of_client = status;
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
};
