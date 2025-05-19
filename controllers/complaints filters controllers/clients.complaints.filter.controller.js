import companyAdminSchema from "../../schema/company.admin.schema.js";
import companySchema from "../../schema/company.schema.js";
import complaintSchema from "../../schema/complaint.schema.js";
import { isValid } from "date-fns";

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
      limit = 10,
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
  companyName: getCompanyName.trim() // trim whitespace
};



    // Apply other filters
    if (complaintId) {
      filter.complaintId = { $regex: complaintId, $options: "i" };
    }

    if (status) {
      filter.status_of_client = status;
    }

    // Handle date filtering
    if (year) {
      const dateFilter = {};
      const y = parseInt(year, 10);

      if (isNaN(y)) {
        console.warn("Backend: Received invalid year parameter:", year);
      } else {
        // Day filter (year=2025&day=1&month=5&page=1)
        if (day && month) {
          const m = parseInt(month, 10) - 1;
          const d = parseInt(day, 10);

          if (!isNaN(m) && m >= 0 && m <= 11 && !isNaN(d) && d >= 1 && d <= 31) {
            const startDate = new Date(y, m, d, 0, 0, 0, 0);
            const endDate = new Date(y, m, d, 23, 59, 59, 999);

            if (isValid(startDate) && isValid(endDate)) {
              dateFilter.$gte = startDate;
              dateFilter.$lte = endDate;
            }
          }
        }
        // Month filter (year=2025&month=5&page=1)
        else if (month) {
          const m = parseInt(month, 10) - 1;

          if (!isNaN(m) && m >= 0 && m <= 11) {
            const startDate = new Date(y, m, 1, 0, 0, 0, 0);
            const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999);

            if (isValid(startDate) && isValid(endDate)) {
              dateFilter.$gte = startDate;
              dateFilter.$lte = endDate;
            }
          }
        }
        // Year filter (year=2024&page=1)
        else {
          const startDate = new Date(y, 0, 1, 0, 0, 0, 0);
          const endDate = new Date(y, 11, 31, 23, 59, 59, 999);

          if (isValid(startDate) && isValid(endDate)) {
            dateFilter.$gte = startDate;
            dateFilter.$lte = endDate;
          }
        }

        // Add date filter to main filter if valid dates were set
        if (dateFilter.$gte && dateFilter.$lte) {
          filter.createdAt = dateFilter;
        }
      }
    }

    // Calculate pagination values
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Get total count
    const totalCount = await complaintSchema.countDocuments(filter);

    // Prepare the query
    let query = complaintSchema.find(filter).sort({ createdAt: -1 });
    

    // Apply pagination if not searching
    if (!isSearching) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }

    // Execute the query
    const complaints = await query;

    // Handle no results
    if (!complaints || complaints.length === 0) {
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
    }

    // Prepare response
    const effectiveLimit = isSearching ? complaints.length : limitNum;
    const effectiveTotalPages = isSearching
      ? 1
      : Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      message: "Fetched complaints successfully",
      data: {
        total: totalCount,
        complaints,
        currentPage: pageNum,
        totalPages: effectiveTotalPages,
        limit: effectiveLimit,
        hasNextPage: isSearching ? false : pageNum < effectiveTotalPages,
        hasPreviousPage: isSearching ? false : pageNum > 1,
        isFilteredSearch: isSearching,
      },
    });
  } catch (error) {
    console.error("Error filtering complaints:", error);
    next(error);
  }
};