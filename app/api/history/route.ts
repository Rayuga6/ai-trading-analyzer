import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getAnalysisHistory,
  getAnalysisById,
} from "@/lib/database";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const limitParam = searchParams.get("limit");

    // Get one specific analysis
    if (id) {
      const analysis = await getAnalysisById(id);

      if (!analysis) {
        return NextResponse.json(
          {
            success: false,
            message: "Analysis not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        analysis,
      });
    }

    // Get analysis history
    let limit = 50;

    if (limitParam) {
      const parsedLimit = Number(limitParam);

      if (
        Number.isInteger(parsedLimit) &&
        parsedLimit > 0 &&
        parsedLimit <= 200
      ) {
        limit = parsedLimit;
      }
    }

    const history = await getAnalysisHistory(limit);

    return NextResponse.json({
      success: true,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error("History GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load analysis history.",
      },
      { status: 500 }
    );
  }
}