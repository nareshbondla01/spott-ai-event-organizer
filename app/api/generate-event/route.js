
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODEL_NAME = "gemini-3.1-flash-lite";

const VALID_CATEGORIES = [
  "tech",
  "music",
  "sports",
  "art",
  "food",
  "business",
  "health",
  "education",
  "gaming",
  "networking",
  "outdoor",
  "community",
];

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function cleanString(value, maxLength = 5000) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parseJsonResponse(text) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Gemini returned invalid JSON.");
    }

    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
}

function getStatus(error) {
  const candidates = [
    error?.status,
    error?.statusCode,
    error?.response?.status,
  ];

  for (const candidate of candidates) {
    const status = Number(candidate);
    if (Number.isInteger(status) && status >= 400) {
      return status;
    }
  }

  const message = String(error?.message || "");

  for (const status of [400, 401, 403, 404, 429, 500, 502, 503, 504]) {
    if (
      new RegExp(`\\b${status}\\b`).test(message) ||
      message.includes(`HTTP ${status}`)
    ) {
      return status;
    }
  }

  return 500;
}

function getPublicError(status) {
  if (status === 400) {
    return "The AI request was rejected. Try a shorter event description.";
  }

  if (status === 401 || status === 403) {
    return "Gemini rejected the API key or access permissions. Check your Google AI Studio API key and project settings.";
  }

  if (status === 404) {
    return `The Gemini model "${MODEL_NAME}" was not found or is unavailable to this API key. Check model availability and API access.`;
  }

  if (status === 429) {
    return "Gemini usage limits have been reached. Check your API quota and try again later.";
  }

  if ([500, 502, 503, 504].includes(status)) {
    return "Gemini is temporarily unavailable or overloaded. Please try again in a minute.";
  }

  return "AI event generation failed. Check the VS Code terminal for details.";
}

export async function POST(req) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      console.error("AI configuration error: GEMINI_API_KEY is missing.");

      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing from the server environment." },
        { status: 500 }
      );
    }

    let body;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body. Please try again." },
        { status: 400 }
      );
    }

    const prompt = cleanString(body?.prompt, 4000);

    if (!prompt) {
      return NextResponse.json(
        { error: "Please describe the event you want to create." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey.trim());

    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
     generationConfig: {
  responseMimeType: "application/json",
  maxOutputTokens: 600,
},
    });

    const instructions = `
You are the event creation assistant for Spott.

Generate suggested form values only. Never create or save an event.

Return one valid JSON object with exactly these fields:
{
  "title": "string",
  "description": "string",
  "category": "tech",
  "suggestedCapacity": 50,
  "locationType": "physical",
  "city": "",
  "state": "",
  "address": "",
  "startDate": "",
  "endDate": "",
  "startTime": "",
  "endTime": "",
  "suggestedTicketType": "free"
}

Rules:
- Title: relevant, professional, maximum 80 characters.
- Description: 2 to 4 informative sentences.
- Category must be one of: ${VALID_CATEGORIES.join(", ")}.
- Technology events should use "tech".
- Use the exact positive whole-number capacity requested. Default to 50.
- Use "online" only if the user clearly requests an online event.
  Otherwise use "physical".
- Extract city and state when explicitly provided or clearly identifiable
  from a named city. Do not invent a venue.
- Address must be empty unless a full street/building address is provided.
- Never invent a venue name or a map link.
- Dates must use YYYY-MM-DD and only be filled when explicitly specified
  or unambiguous. Otherwise use empty strings.
- Times must use HH:mm and only be filled when specified.
  Otherwise use empty strings.
- Always use "free" for suggestedTicketType.
- Include every field. Use empty strings for unknown text values.
- suggestedCapacity must be a JSON number.
- Return JSON only, without markdown.

User event idea:
${JSON.stringify(prompt)}
`;

    let result;
    let lastError;

    // Retry only temporary service errors and rate limits.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(
          `Gemini request: model=${MODEL_NAME}, attempt=${attempt}/3`
        );

        result = await model.generateContent(instructions);
        break;
      } catch (error) {
        lastError = error;
        const status = getStatus(error);

        console.error("Gemini request failed:", {
          status,
          message: error?.message,
          attempt,
        });

        const retryable = [429, 500, 502, 503, 504].includes(status);

        if (!retryable || attempt === 3) {
          break;
        }

        await sleep(attempt * 2000);
      }
    }

    if (!result) {
      const status = getStatus(lastError);

      return NextResponse.json(
        { error: getPublicError(status) },
        {
          status:
            status >= 400 && status <= 599 ? status : 500,
        }
      );
    }

    const text = result.response.text();

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    const generated = parseJsonResponse(text);

    const rawCategory = cleanString(
      generated.category,
      40
    ).toLowerCase();

    const categoryAliases = {
      technology: "tech",
      tech: "tech",
      meetup: "community",
      workshop: "education",
      conference: "business",
    };

    const normalizedCategory =
      categoryAliases[rawCategory] || rawCategory;

    const rawCapacity = Number(generated.suggestedCapacity);

    const suggestedCapacity =
      Number.isSafeInteger(rawCapacity) && rawCapacity >= 1
        ? Math.min(rawCapacity, 1000000)
        : 50;

    const locationType =
      cleanString(generated.locationType, 20).toLowerCase() === "online"
        ? "online"
        : "physical";

    function validDate(value) {
      const date = cleanString(value, 10);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return "";
      }

      const parsed = new Date(`${date}T00:00:00.000Z`);

      return !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date
        ? date
        : "";
    }

    function validTime(value) {
      const time = cleanString(value, 5);

      return /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
        ? time
        : "";
    }

    const eventData = {
      title: cleanString(generated.title, 80),
      description: cleanString(generated.description, 3000),
      category: VALID_CATEGORIES.includes(normalizedCategory)
        ? normalizedCategory
        : "community",
      suggestedCapacity,
      locationType,
      city: cleanString(generated.city, 100),
      state: cleanString(generated.state, 100),
      address: cleanString(generated.address, 300),
      venue: "",
      startDate: validDate(generated.startDate),
      endDate: validDate(generated.endDate),
      startTime: validTime(generated.startTime),
      endTime: validTime(generated.endTime),
      suggestedTicketType: "free",
    };

    if (!eventData.title || !eventData.description) {
      throw new Error(
        "Gemini did not return a complete title and description."
      );
    }

    console.log("Gemini event generation succeeded.");

    return NextResponse.json(eventData);
  } catch (error) {
    const status = getStatus(error);

    console.error("AI event generation failed:", {
      status,
      message: error?.message,
      details: error?.errorDetails,
    });

    return NextResponse.json(
      {
        error:
          error?.message === "Gemini returned invalid JSON."
            ? "Gemini returned an invalid response. Please try again."
            : getPublicError(status),
      },
      { status: status >= 400 && status <= 599 ? status : 500 }
    );
  }
}
