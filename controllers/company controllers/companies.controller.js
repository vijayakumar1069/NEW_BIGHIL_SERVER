import companySchema from "../../schema/company.schema.js";

export const getCompanies = async (req, res, next) => {
  try {
    const { search } = req.query;

    // // Validate search query
    // if (!search || search.trim().length < 1) {
    //   const error = new Error("Invalid search");
    //   error.status = 400;
    //   throw error;
    // }

    const searchRegex = new RegExp(search, "i");

    const companies = await companySchema
      .find({
        $or: [{ companyName: { $regex: searchRegex } }],
      })
      .select("companyName _id") // Select only necessary fields
      .limit(10); // Limit results

    res.status(200).json({
      success: true,
      count: companies.length,
      data: companies,
    });
  } catch (error) {
    next(error);
  }
};
