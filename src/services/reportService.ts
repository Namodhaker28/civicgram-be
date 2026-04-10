import { Report } from "../models/index.js";

/** Create a report. */
export async function createReport(
  reporterId: string,
  targetType: "post" | "user",
  targetId: string,
  reason: string = ""
): Promise<InstanceType<typeof Report>> {
  return Report.create({
    reporter: reporterId,
    targetType,
    targetId,
    reason,
  });
}
