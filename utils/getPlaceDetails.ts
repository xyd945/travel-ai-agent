// utils/getPlaceDetails.ts
export async function getPlaceDetails(placeName: string): Promise<any> {
    // This API key should be in your .env.local as NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Error: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing');
      return null;
    }
  
    // For demonstration, we request:
    // - place_id
    // - name
    // - formatted_address
    // - geometry.location
    // - photos
    // - types
    // You can add or remove fields as needed.
    const fields = [
      'place_id',
      'name',
      'formatted_address',
      'geometry/location',
      'photos',
      'types'
    ].join(',');
  
    // Encode the place name for the URL
    const encodedPlace = encodeURIComponent(placeName);
  
    // Construct the URL for Find Place From Text
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodedPlace}&inputtype=textquery&fields=${fields}&key=${apiKey}`;
  
    try {
      // Make the fetch call
      console.log('getPlaceDetails() → Fetching place:', placeName);
      console.log('Request URL:', url);
  
      const response = await fetch(url);
      if (!response.ok) {
        // If response isn’t 2xx, log and return null
        const errorText = await response.text();
        console.error('Google Places API error:', response.status, errorText);
        return null;
      }
  
      // Parse the JSON response
      const data = await response.json();
  
      // If no candidates found, return null
      if (!data?.candidates || data.candidates.length === 0) {
        console.warn(`No candidates found for "${placeName}"`);
        return null;
      }
  
      // Return the first matching place
      const place = data.candidates[0];
      console.log('Place found:', place);
      return place;
    } catch (error) {
      // Catch any network or runtime errors
      console.error('Error fetching place details:', error);
      return null;
    }
  }
  