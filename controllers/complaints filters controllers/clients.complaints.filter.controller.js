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
      department,
      companyName,
      day,
      month,
      year,
      priority,
      page = 1,
      limit = 10, // Default to 10 for regular pagination
    } = req.query;

    // Check if any search filters are present (excluding page/limit for this check)
    const isSearching = !!(
      complaintId ||
      status ||
      day ||
      month ||
      year ||
      companyName ||
      department||
      priority
    );

    // Get company information
    const adminId = req.user.id;
    const { role } = req.user;
    const companyAdmin = await companyAdminSchema.findById(adminId);
    if (!companyAdmin) {
      const error = new Error("Company admin not found");
      error.status = 404;
      throw error;
    }

    const getCompanyInfo = await companySchema.findById(companyAdmin.companyId);
    if (!getCompanyInfo) {
      const error = new Error("Company not found");
      error.status = 404;
      throw error;
    }
    if (role === "ADMIN" && !getCompanyInfo.visibleToIT) {
      const error = new Error(
        "You are not authorized to view this company's complaints"
      );
      error.statusCode = 403; // Forbidden
      throw error;
    }
    const getCompanyId = getCompanyInfo._id;

    // Build the filter object
    const filter = {
      companyId: getCompanyId,
    };

    // Apply other filters
    if (complaintId) {
      filter.complaintId = { $regex: complaintId, $options: "i" };
    }
    if (department) {
      filter.department = department;
    }

    if (status) {
      filter.status_of_client = status;
    }
    if (priority) {
      filter.priority = priority;
    }

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

    // Get total count first using the built filter
    const totalCount = await complaintSchema.countDocuments(filter);

    // Prepare the query
    let query = complaintSchema.find(filter).sort({ createdAt: -1 });

    // Apply pagination ONLY if NOT doing a full search (i.e., when filters are empty)
    // If isSearching is true, we return all matching results for the filters.
    if (!isSearching) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }

    // Execute the query
    const complaints = await query;

    // Check if results were found, even when searching
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

    const effectiveLimit = isSearching ? complaints.length : limitNum;
    const effectiveTotalPages = isSearching
      ? complaints.length > 0
        ? 1
        : 0
      : Math.ceil(totalCount / limitNum);

    let returnData = {
      success: true,
      total: totalCount,
      complaints,
      currentPage: pageNum,
      totalPages: effectiveTotalPages,
      limit: effectiveLimit,
      hasNextPage: isSearching ? false : pageNum < effectiveTotalPages,
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
