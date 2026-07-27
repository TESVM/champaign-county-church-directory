import type { NextRequest } from "next/server";
import { findChurchBySlug } from "@/lib/api/churches";
import { toChurchDetail } from "@/lib/api/serializers";
import { apiError, apiSuccess, withApiErrorHandling } from "@/lib/api/response";

export const GET = withApiErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ slug: string }> }) => {
    const { slug } = await context.params;
    const church = await findChurchBySlug(slug);

    if (!church) {
      return apiError("not_found", "No church matches that address.");
    }

    return apiSuccess(toChurchDetail(church), { cache: true });
  }
);
