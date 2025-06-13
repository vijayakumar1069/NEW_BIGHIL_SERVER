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
      department
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

    // --- Handle date filtering ---
    // Only proceed if a year parameter is provided (frontend validation ensures year is sent for any date filter)
    if (year) {
      const dateFilter = {};
      const y = parseInt(year, 10); // Parse year as integer

      // Basic validation for year
      if (isNaN(y)) {
        console.warn("Backend: Received invalid year parameter:", year);
        // If year is invalid, do not attempt date filtering.
      } else {
        // Check if month is also provided and is a meaningful value (not 'anyMonth')
        if (month && month !== "anyMonth") {
          // Parse month as integer and convert to 0-indexed (0-11) for JS Date constructor
          const m = parseInt(month, 10) - 1; // Adjust to 0-indexed for new Date()

          // Basic validation for month
          if (isNaN(m) || m < 0 || m > 11) {
            console.warn("Backend: Received invalid month parameter:", month);
            // If month is invalid, do not attempt date filtering beyond year.
          } else {
            // Check if day is also provided and is a meaningful value (not 'allDay')
            if (day && day !== "allDay") {
              // Case 1: Specific Day (year, month, day)
              const d = parseInt(day, 10); // Parse day as integer

              // Basic validation for day
              if (isNaN(d)) {
                console.warn("Backend: Received invalid day parameter:", day);
                // If day is invalid, do not apply this specific day filter.
              } else {
                // Construct start and end dates for the specific day *in the server's local timezone*
                // Mongoose will correctly convert these to UTC for the query.
                const startDate = new Date(y, m, d, 0, 0, 0, 0); // Midnight start of the day local time
                const endDate = new Date(y, m, d, 23, 59, 59, 999); // End of the day local time

                // Check if the constructed dates are valid JS Dates
                if (isValid(startDate) && isValid(endDate)) {
                  dateFilter.$gte = startDate;
                  dateFilter.$lte = endDate;
                } else {
                  console.error(
                    `Backend: Invalid local date created for day filter: year=\${year}, month=\${month}, day=\${day}`
                  );
                  // Log error but do not set filter if dates are invalid
                }
              }
            } else {
              // Case 2: Specific Month (year, month, no day or day is 'allDay')
              // Construct start and end dates for the specific month *in the server's local timezone*
              const startDate = new Date(y, m, 1, 0, 0, 0, 0); // 1st day of the month local time
              const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999); // Last day of the month local time

              if (isValid(startDate) && isValid(endDate)) {
                dateFilter.$gte = startDate;
                dateFilter.$lte = endDate;
              } else {
                console.error(
                  `Backend: Invalid local date created for month filter: year=\${year}, month=\${month}`
                );
                // Log error but do not set filter if dates are invalid
              }
            }
          } // End if valid month
        } else {
          // Case 3: Specific Year (year, no month, or month is 'anyMonth')
          // Construct start and end dates for the specific year *in the server's local timezone*
          const startDate = new Date(y, 0, 1, 0, 0, 0, 0); // Jan 1st local time
          const endDate = new Date(y, 11, 31, 23, 59, 59, 999); // Dec 31st local time

          if (isValid(startDate) && isValid(endDate)) {
            dateFilter.$gte = startDate;
            dateFilter.$lte = endDate;
          } else {
            console.error(
              `Backend: Invalid local date created for year filter: year=\${year}`
            );
            // Log error but do not set filter if dates are invalid
          }
        }

        // Only add the createdAt filter if a valid date range was constructed
        if (
          dateFilter.$gte instanceof Date &&
          dateFilter.$lte instanceof Date &&
          isValid(dateFilter.$gte) &&
          isValid(dateFilter.$lte)
        ) {
          filter.createdAt = dateFilter;
        } else {
          // If date parameters were provided (starting with a valid year)
          // but resulted in invalid or incomplete date ranges (e.g., month 13, day 30 in Feb),
          // log a warning and do NOT add the date filter to the query.
          console.warn(
            "Backend: Date filter parameters provided but resulted in an invalid or incomplete query range (no filter applied):",
            req.query
          );
        }
      } // End if valid year parse
    } // End if year parameter is present
    // --- End date filtering ---

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
