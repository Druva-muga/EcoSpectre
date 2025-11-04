import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { ScanContext, SustainabilityScore } from '../types';
import { ENV } from '../config/env';

const GEMINI_API_KEY_STORAGE = 'GEMINI_API_KEY';
const GEMINI_MODEL = 'gemini-2.5-flash-preview-09-2025';
const RATE_LIMIT_INTERVAL = 1000; // 1 second between requests

interface GeminiVisionAnalysis {
  detected_labels: string;
  packaging_type: string;
  material_hints: string;
  ocr_text: string;
  brand_text: string;
  user_note: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

class RateLimiter {
  private lastRequest: number = 0;

  async waitForNextSlot(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < RATE_LIMIT_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, RATE_LIMIT_INTERVAL - timeSinceLastRequest)
      );
    }
    
    this.lastRequest = Date.now();
  }
}

const rateLimiter = new RateLimiter();

function parseJsonFromText(text: string) {
  // Fast path
  try {
    return JSON.parse(text);
  } catch {}

  // Try to extract the first top-level JSON object by brace matching
  let start = -1;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {}
      }
    }
  }
  // Fallback: strip code fences if present
  const fenced = text.replace(/^```(json)?/gi, '').replace(/```$/g, '').trim();
  return JSON.parse(fenced);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetries(
  url: string,
  options: RequestInit,
  {
    retries = 3,
    baseDelayMs = 1000,
    timeoutMs = 15000,
  }: { retries?: number; baseDelayMs?: number; timeoutMs?: number } = {}
): Promise<Response> {
  let attempt = 0;
  let lastError: any = null;
  while (attempt <= retries) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) return res;

      // Try to parse error payload for message/status
      let errorMessage = `API Error: ${res.status}`;
      try {
        const errJson = await res.json();
        errorMessage = errJson.error?.message || errorMessage;
      } catch {}

      // Retry on typical transient statuses
      if ([429, 500, 502, 503, 504].includes(res.status) || /overloaded|quota|rate limit/i.test(errorMessage)) {
        if (attempt === retries) {
          throw new Error(errorMessage);
        }
      } else {
        throw new Error(errorMessage);
      }
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
    }

    const delay = baseDelayMs * Math.pow(2, attempt); // exponential backoff
    await sleep(delay);
    attempt++;
  }
  throw (lastError instanceof Error ? lastError : new Error('Network error'));
}

export async function getGeminiApiKey(): Promise<string | null> {
  const storedKey = await SecureStore.getItemAsync(GEMINI_API_KEY_STORAGE);
  if (storedKey) return storedKey;
  // Fallback to env only if it's not empty
  return ENV.GEMINI_API_KEY || null;
}

export async function setGeminiApiKey(apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(GEMINI_API_KEY_STORAGE, apiKey);
}

async function getApiUrl(apiKey: string): Promise<string> {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}

async function imageToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as const,
    });
    return base64;
  } catch (error) {
    throw new Error('Failed to read image file. Please try again.');
  }
}

export async function analyzeImageWithGemini(imageUri: string): Promise<GeminiVisionAnalysis> {
  console.log("[GeminiVision] Analyzing image...");
  
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not found. Please set it in settings.");
  }

  await rateLimiter.waitForNextSlot();

  try {
    const base64Image = await imageToBase64(imageUri);
    const apiUrl = await getApiUrl(apiKey);
    
    const prompt = `
You are an expert product analyzer. Look at the image and identify the product, packaging, materials, and any visible text.
Return EXACTLY one JSON object (no extra text) with the following keys. If a value is unknown, return "unknown".
{
  "detected_labels": "string, e.g., 'soda can; beverage; aluminum'",
  "packaging_type": "string, e.g., 'can', 'bottle', 'box', 'pouch'",
  "material_hints": "string, e.g., 'aluminum', 'PET plastic', 'cardboard'",
  "ocr_text": "string of all visible text, e.g., 'Coca-Cola, 12 fl oz, 100% recyclable'",
  "brand_text": "string, e.g., 'Coca-Cola'",
  "user_note": ""
}`;

    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topP: 1,
        topK: 32
      }
    };

    const response = await fetchWithRetries(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, { retries: 3, baseDelayMs: 1000, timeoutMs: 20000 });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error("Image analysis blocked by safety settings.");
      }
      throw new Error("Invalid response from vision API.");
    }

    const text = data.candidates[0].content.parts[0].text;
    const result: GeminiVisionAnalysis = parseJsonFromText(text);
    
    // Validate response structure
    if (!result.detected_labels || !result.packaging_type || !result.material_hints) {
      throw new Error("Invalid analysis response structure");
    }

    return result;
  } catch (error) {
    console.error("[GeminiVision] Error:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse API response");
    }
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

export async function getSustainabilityScore(
  context: Omit<ScanContext, 'image' | 'image_thumb'>
): Promise<SustainabilityScore> {
  console.log("[GeminiScore] Getting sustainability score...");

  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key not found. Please set it in settings.");
  }

  await rateLimiter.waitForNextSlot();

  try {
    const apiUrl = await getApiUrl(apiKey);

    const prompt = `
You are an eco-assistant. Given the short context below about a product, return a JSON object with a sustainability assessment.

Context (exact text lines):
- detected_labels: ${context.detected_labels}
- packaging_type: ${context.packaging_type}
- material_hints: ${context.material_hints}
- visible_text: ${context.ocr_text || ''}
- brand_text: ${context.brand_text || ''}
- user_note: ${context.user_note || ''}

Return EXACTLY one JSON object (no extra text) with the following keys:
{
  "score": integer between 0 and 100,
  "breakdown": {
    "materials": integer 0-100,
    "packaging": integer 0-100,
    "certifications": integer 0-100,
    "category_baseline": integer 0-100
  },
  "top_factors": [
    {"factor": "string", "impact": "positive|negative", "explanation": "short text"}
  ],
  "suggestion": "single-sentence suggestion",
  "disposal": "short disposal instruction (one sentence)"
}

Rules:
- Score is a weighted sum of breakdown (materials 40%, packaging 30%, certifications 20%, category 10%).
- If visible_text contains 'recyclable'/'compostable' or known certifications (FSC, Organic), increase certifications subscore.
- Keep explanations short (max 20 words each).`;

    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        topP: 1,
        topK: 32
      }
    };

    const response = await fetchWithRetries(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, { retries: 3, baseDelayMs: 1000, timeoutMs: 20000 });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response from scoring API.");
    }

    const text = data.candidates[0].content.parts[0].text;
    const result: SustainabilityScore = parseJsonFromText(text);

    // Validate response structure
    if (!result.score || !result.breakdown || !result.top_factors || !result.suggestion || !result.disposal) {
      throw new Error("Invalid score response structure");
    }

    return result;
  } catch (error) {
    console.error("[GeminiScore] Error:", error);
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse API response");
    }
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}