import prisma from "../lib/prisma";

/**
 * STUB: Trigger CV scoring service
 *
 * In production this will POST the CV file to the cv-scoring microservice
 * at CV_SCORING_SERVICE_URL and update the CvUpload record with the score.
 *
 * For now it simulates scoring with a random value after a short delay.
 */
export async function triggerCvScoring(cvUploadId: string, _filePath: string): Promise<void> {
  console.log(`[STUB] Triggering CV scoring for upload ${cvUploadId}`);

  // Simulate async scoring with a delay
  setTimeout(async () => {
    try {
      const mockScore = Math.round((Math.random() * 40 + 60) * 100) / 100; // 60-100
      await prisma.cvUpload.update({
        where: { id: cvUploadId },
        data: { cvScore: mockScore },
      });
      console.log(`[STUB] CV scoring complete for ${cvUploadId}: score=${mockScore}`);
    } catch (err) {
      console.error(`[STUB] CV scoring update failed for ${cvUploadId}:`, err);
    }
  }, 2000);
}
