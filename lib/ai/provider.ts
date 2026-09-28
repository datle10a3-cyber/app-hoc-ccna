import { PasteItemParsed } from '../types';
import { classifyLocalText } from '../parser/local-classifier';

export async function parseWithAIOrFallback(rawText: string): Promise<PasteItemParsed[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('[AI Provider] GEMINI_API_KEY not found. Using local Cisco CLI regex parser.');
    return classifyLocalText(rawText);
  }

  try {
    const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an expert CCNA Networking Assistant. Analyze and break down the following raw pasted networking notes into classified structured items.
Classifications allowed: "Theory", "Definition", "Command", "Configuration", "Command Output", "Explanation", "Example", "Important Note", "Warning", "Troubleshooting", "Exercise", "Solution", "Lab", "IP Address".

Return ONLY a valid JSON array of objects with keys:
"classification", "title", "formattedContent", "suggestedTags" (array of strings).

Raw Content:
${rawText}`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      console.warn('[AI Provider] Gemini API request failed. Falling back to local classifier.');
      return classifyLocalText(rawText);
    }

    const data = await response.json();
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON array from output
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return classifyLocalText(rawText);
    }

    const parsedArray = JSON.parse(jsonMatch[0]);
    return parsedArray.map((item: any, index: number) => ({
      id: `ai-paste-${Date.now()}-${index}`,
      classification: item.classification || 'Theory',
      title: item.title || `Parsed Item ${index + 1}`,
      rawContent: item.formattedContent || rawText,
      formattedContent: item.formattedContent || rawText,
      suggestedTags: item.suggestedTags || ['CCNA', 'AI-Parsed'],
      action: 'create-new'
    }));
  } catch (error) {
    console.error('[AI Provider Error]:', error);
    return classifyLocalText(rawText);
  }
}
