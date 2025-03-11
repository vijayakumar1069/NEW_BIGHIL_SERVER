export const convertToCSV = (data) => {
  const csvRows = [];

  // Define headers
  const headers = [
    "Complaint ID",
    "Company Name",
    "Complaint Against",
    "Complaint Message",
    "Status",
    "Priority",
    "Tags",
    "Evidence",
    "Created At",
    "Updated At",
  ];
  csvRows.push(headers.join(","));

  // Loop over each complaint and create a CSV row
  data.forEach((complaint) => {
    // Join tags array if available, or leave blank
    const tags = Array.isArray(complaint.tags) ? complaint.tags.join("; ") : "";
    // For evidence, join the file names from each evidence object
    const evidence = Array.isArray(complaint.evidence)
      ? complaint.evidence.map((ev) => ev.fileName).join("; ")
      : "";

    const values = [
      `"${complaint.complaintId}"`,
      `"${complaint.companyName}"`,
      `"${complaint.complaintAgainst}"`,
      `"${complaint.complaintMessage}"`,
      `"${complaint.status_of_client}"`,
      `"${complaint.priority}"`,
      `"${tags}"`,
      `"${evidence}"`,
      `"${new Date(complaint.createdAt).toLocaleDateString()}"`,
      `"${new Date(complaint.updatedAt).toLocaleDateString()}"`,
    ];

    csvRows.push(values.join(","));
  });

  return csvRows.join("\n");
};
