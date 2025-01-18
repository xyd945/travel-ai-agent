// pages/api/ai.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userPrompt, conversationHistory } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing "userPrompt" in request body' });
  }

  try {
    const GOOGLE_AI_STUDIO_API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!GOOGLE_AI_STUDIO_API_KEY) {
      throw new Error('GOOGLE_AI_STUDIO_API_KEY is missing in environment variables');
    }

    const contextPrompt = `You are a travel assistant with knowledge of destinations worldwide. You understand both direct travel queries and follow-up questions about previously discussed locations.

Previous conversation context:
${conversationHistory?.map((msg: any) => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n') || 'No previous context'}

Consider the following as valid travel-related queries:
- Direct questions about locations ("Where should I eat in Tokyo?")
- Follow-up questions about a previously mentioned location ("What about something more affordable?", "Any local spots?")
- Questions about specific types of places (budget-friendly, luxury, local favorites, tourist spots)
- Questions about specific requirements (family-friendly, vegetarian, accessible)
- Questions about timing (breakfast places, late-night spots)
- Questions about atmosphere (quiet cafes, lively bars)

For each place recommended, consider including:
- Price range (budget, moderate, expensive)
- Type of experience (local, tourist, authentic, modern)
- Special features (view, atmosphere, unique aspects)
- Best time to visit
- Local tips

Respond with valid JSON only in this format:
{
  "location": "City, Country",
  "placesOfInterest": [
    {
      "name": "Place Name",
      "description": "Detailed description including price range and special features",
      "type": "attraction|restaurant|hotel|shopping|entertainment",
      "priceRange": "budget|moderate|expensive",
      "experience": "local|tourist|authentic|modern"
    }
  ]
}

If the query is completely unrelated to travel or places, respond with:
{"location": "not_travel_related", "placesOfInterest": []}

Current user query: "${userPrompt}"`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GOOGLE_AI_STUDIO_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: contextPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return res.status(response.status).json({ error: `Gemini API Error: ${response.status} - ${errorData?.error?.message || response.statusText}` });
    }

    const data = await response.json();
    
    try {
      // Log the raw response for debugging
      console.log("Raw AI response:", data.candidates[0].content.parts[0].text);

      // Improved JSON parsing
      let jsonData = data.candidates[0].content.parts[0].text.trim();
      // Remove any potential markdown code block markers
      jsonData = jsonData.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      // Remove any single backticks
      jsonData = jsonData.replace(/^`/, '').replace(/`$/, '').trim();
      
      console.log("Cleaned JSON string:", jsonData);

      const parsedData = JSON.parse(jsonData);

      // Validate the response format
      if (!parsedData.location || !Array.isArray(parsedData.placesOfInterest)) {
        throw new Error("Invalid response format");
      }

      return res.status(200).json(parsedData);
    } catch (parseError) {
      console.error("Error parsing JSON from Gemini:", parseError);
      console.error("Attempted to parse:", data.candidates[0].content.parts[0].text);
      return res.status(500).json({ 
        error: "Could not parse AI response as JSON. The AI might not have returned data in the expected format.",
        rawResponse: data.candidates[0].content.parts[0].text 
      });
    }

  } catch (error: any) {
    console.error('Error calling Gemini:', error);
    return res.status(500).json({ error: error.message });
  }
}