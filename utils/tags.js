const PRIORITY_LEVELS = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const priorityMapping = [
  // Critical Priority (Weight: 5)
  { name: "Security Breach", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  {
    name: "Data Privacy Violation",
    priority: PRIORITY_LEVELS.CRITICAL,
    weight: 5,
  },
  {
    name: "Unauthorized Charges",
    priority: PRIORITY_LEVELS.CRITICAL,
    weight: 5,
  },
  {
    name: "Fraudulent Transaction",
    priority: PRIORITY_LEVELS.CRITICAL,
    weight: 5,
  },
  { name: "Identity Theft", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  { name: "Financial Loss", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  { name: "Unsafe Product", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  { name: "Health Hazard", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  { name: "Physical Injury", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  { name: "Legal Dispute", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  { name: "Account Hacked", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  { name: "Service Denial", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  {
    name: "Critical System Failure",
    priority: PRIORITY_LEVELS.CRITICAL,
    weight: 5,
  },
  { name: "Personal Data Leak", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  { name: "Harassment", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  { name: "Discrimination", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  {
    name: "Regulatory Non-Compliance",
    priority: PRIORITY_LEVELS.CRITICAL,
    weight: 5,
  },
  { name: "Contract Violation", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  { name: "False Advertising", priority: PRIORITY_LEVELS.CRITICAL, weight: 5 },
  {
    name: "Severe Safety Issue",
    priority: PRIORITY_LEVELS.CRITICAL,
    weight: 5,
  },

  // High Priority (Weight: 4)
  { name: "Billing Issue", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  { name: "Refund Not Issued", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  { name: "Order Not Received", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  {
    name: "Service Cancellation Problem",
    priority: PRIORITY_LEVELS.HIGH,
    weight: 4,
  },
  {
    name: "Subscription Cancellation Issue",
    priority: PRIORITY_LEVELS.HIGH,
    weight: 4,
  },
  { name: "Overpricing", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  { name: "Misleading Information", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  { name: "Hidden Fees", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  {
    name: "Payment Processing Error",
    priority: PRIORITY_LEVELS.HIGH,
    weight: 4,
  },
  { name: "Warranty Claim", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  {
    name: "Damaged Product Received",
    priority: PRIORITY_LEVELS.HIGH,
    weight: 4,
  },
  { name: "Product Defect", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  {
    name: "Quality Control Failure",
    priority: PRIORITY_LEVELS.HIGH,
    weight: 4,
  },
  { name: "Shipping Delay", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  {
    name: "Customer Service Complaint",
    priority: PRIORITY_LEVELS.HIGH,
    weight: 4,
  },
  { name: "Poor Communication", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  { name: "Late Response", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  {
    name: "Technical Support Issue",
    priority: PRIORITY_LEVELS.HIGH,
    weight: 4,
  },
  { name: "Account Suspension", priority: PRIORITY_LEVELS.HIGH, weight: 4 },
  { name: "Return Policy Issue", priority: PRIORITY_LEVELS.HIGH, weight: 4 },

  // Medium Priority (Weight: 3)
  { name: "Installation Issue", priority: PRIORITY_LEVELS.MEDIUM, weight: 3 },
  { name: "Feature Not Working", priority: PRIORITY_LEVELS.MEDIUM, weight: 3 },
  { name: "Software Bug", priority: PRIORITY_LEVELS.MEDIUM, weight: 3 },
  {
    name: "Unresponsive Customer Support",
    priority: PRIORITY_LEVELS.MEDIUM,
    weight: 3,
  },
  { name: "Incorrect Billing", priority: PRIORITY_LEVELS.MEDIUM, weight: 3 },
  { name: "Delayed Refund", priority: PRIORITY_LEVELS.MEDIUM, weight: 3 },
  {
    name: "Loyalty Program Issue",
    priority: PRIORITY_LEVELS.MEDIUM,
    weight: 3,
  },
  { name: "Delivery Mismatch", priority: PRIORITY_LEVELS.MEDIUM, weight: 3 },
  { name: "Miscommunication", priority: PRIORITY_LEVELS.MEDIUM, weight: 3 },
  { name: "Lack of Transparency", priority: PRIORITY_LEVELS.MEDIUM, weight: 3 },

  // Low Priority (Weight: 2)
  { name: "Minor Defect", priority: PRIORITY_LEVELS.LOW, weight: 2 },
  { name: "Feature Request", priority: PRIORITY_LEVELS.LOW, weight: 2 },
  { name: "Feedback on Service", priority: PRIORITY_LEVELS.LOW, weight: 2 },
  { name: "Packaging Issue", priority: PRIORITY_LEVELS.LOW, weight: 2 },
  {
    name: "Difficult Website Navigation",
    priority: PRIORITY_LEVELS.LOW,
    weight: 2,
  },
  { name: "Confusing Instructions", priority: PRIORITY_LEVELS.LOW, weight: 2 },
  {
    name: "App Crashing Occasionally",
    priority: PRIORITY_LEVELS.LOW,
    weight: 2,
  },
  { name: "Long Hold Time", priority: PRIORITY_LEVELS.LOW, weight: 2 },
  {
    name: "Excessive Marketing Emails",
    priority: PRIORITY_LEVELS.LOW,
    weight: 2,
  },
  { name: "Long Checkout Process", priority: PRIORITY_LEVELS.LOW, weight: 2 },
];

export function calculateComplaintPriority(selectedTags) {
  let totalWeight = 0;
  let totalPriority = 0;

  for (let i = 0; i < selectedTags.length; i++) {
    const currentTag = priorityMapping.find(
      (item) => item.name == selectedTags[i]
    );
    if (currentTag) {
      totalWeight += currentTag.weight;
      totalPriority += currentTag.priority * currentTag.weight;
    }
  }

  if (totalWeight === 0) return "LOW"; // Default if no tags found

  // Calculate average priority
  const averagePriority = totalPriority / totalWeight;

  // Assign final priority based on threshold
  if (averagePriority >= 3.5) return "CRITICAL";
  if (averagePriority >= 2.5) return "HIGH";
  if (averagePriority >= 1.5) return "MEDIUM";
  return "LOW";
}
