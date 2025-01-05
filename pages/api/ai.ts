// pages/api/ai.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userPrompt } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'Missing "userPrompt" in request body' });
  }

  try {
    const GOOGLE_AI_STUDIO_API_KEY = process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!GOOGLE_AI_STUDIO_API_KEY) {
      throw new Error('GOOGLE_AI_STUDIO_API_KEY is missing in environment variables');
    }

    const prompt = `You are a travel assistant. Given a user's travel query, provide a JSON response in the following format:

{
  "location": "City, Country", // The main location mentioned in the query. If no location is explicitly mentioned, return "null" as a string.
  "placesOfInterest": [ // An array of places of interest. If no places are found, return an empty array [].
    {
      "name": "Place Name",
      "description": "Short description of the place"
    },
    // ... more places
  ]
}

If the user asks a question that is not related to travel, return:
{
    "location": "not_travel_related",
    "placesOfInterest": []
}

User Query: ${userPrompt}`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_STUDIO_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API error:', errorData);
        return res.status(response.status).json({ error: `Gemini API Error: ${response.status} - ${errorData?.error?.message || response.statusText}` });
    }

    const data = await response.json();

    try {
      // Improved backtick removal and whitespace trimming
      let jsonData = data.candidates[0].content.parts[0].text.trim();
      jsonData = jsonData.replace(/^```json/, '').replace(/```$/, '').trim(); // Remove triple backticks with "json"
      jsonData = jsonData.replace(/^`/, '').replace(/`$/, '').trim();       // Remove single backticks
      
      console.log("Data after backtick removal:", jsonData); // Log for debugging

      const parsedData = JSON.parse(jsonData);
      return res.status(200).json(parsedData);
    } catch (parseError) {
      // More specific error handling
      console.error("Error parsing JSON from Gemini:", data.candidates[0].content.parts[0].text, parseError);
      return res.status(500).json({ error: "Could not parse AI response as JSON. The AI might not have returned data in the expected format." });
    }

  } catch (error: any) {
    console.error('Error calling Gemini:', error);
    return res.status(500).json({ error: error.message });
  }
}