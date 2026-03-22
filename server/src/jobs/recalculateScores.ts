import prisma from "../lib/prisma";

/**
 * STUB: Recalculate slot quality score for a PGP2
 *
 * In production this will:
 * 1. Fetch all completed matches for the PGP2
 * 2. Fetch all feedback for those matches
 * 3. Calculate average rating, total slots, feedback count
 * 4. Compute composite score
 * 5. Update SlotQualityScore record
 */
export async function recalculateSlotQualityScore(pgp2UserId: string): Promise<void> {
  console.log(`[STUB] Recalculating slot quality score for user ${pgp2UserId}`);

  try {
    const matches = await prisma.match.findMany({
      where: { pgp2Id: pgp2UserId, status: "COMPLETED" },
      include: { feedback: true },
    });

    const totalSlots = matches.length;
    const allFeedback = matches.flatMap((m) => m.feedback);
    const feedbackCount = allFeedback.length;
    const avgRating = feedbackCount > 0
      ? allFeedback.reduce((sum, f) => sum + f.rating, 0) / feedbackCount
      : null;

    // Simple composite: base 50, adjusted by avg rating (1-5 scale → -20 to +20)
    const score = avgRating !== null ? 50 + (avgRating - 3) * 10 : 50;

    await prisma.slotQualityScore.upsert({
      where: { userId: pgp2UserId },
      update: { score, totalSlots, feedbackCount, avgRating },
      create: { userId: pgp2UserId, score, totalSlots, feedbackCount, avgRating },
    });

    console.log(`[STUB] Updated slot quality score for ${pgp2UserId}: score=${score}`);
  } catch (err) {
    console.error(`[STUB] Failed to recalculate score for ${pgp2UserId}:`, err);
  }
}
