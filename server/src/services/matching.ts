/**
 * STUB: Matching algorithm
 *
 * In production this will:
 * 1. Fetch all active supply forms (PGP2) for today's window
 * 2. Fetch all demand forms (PGP1) for today's window
 * 3. Score and rank PGP2s using SlotQualityScore
 * 4. Score and rank PGP1s using CV score
 * 5. Run matching algorithm (e.g., stable matching / greedy)
 * 6. Create Match records
 * 7. Send notification emails
 */
export async function runMatchingAlgorithm(windowDate: Date): Promise<{ matchesCreated: number }> {
  console.log(`[STUB] Running matching algorithm for window date: ${windowDate.toISOString()}`);
  console.log("[STUB] Matching algorithm not yet implemented — returning 0 matches");

  return { matchesCreated: 0 };
}
