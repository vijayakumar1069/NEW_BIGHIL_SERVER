import complaintSchema from "../schema/complaint.schema.js";
import timeLineModel from "../schema/complaint.timeline.schema.js";

export async function createTimelineEntry(
  complaintId,
  status,
  changedBy,
  customMessage = null,
  visibleToUser = false
) {
  const timelineObj = {
    complaintId,
    status_of_client: status,
    changedBy,
    timestamp: Date.now(),
    message: customMessage || `Status changed to ${status}`,
    visibleToUser,
  };

  const timelineEntry = await timeLineModel.create(timelineObj);

  // Add timeline to complaint
  await complaintSchema.findByIdAndUpdate(complaintId, {
    $push: { timeline: timelineEntry._id },
  });

  return timelineEntry;
}
