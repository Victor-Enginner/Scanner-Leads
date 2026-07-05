/* eslint-disable @typescript-eslint/no-explicit-any */


export interface PlaceResult {
  placeId: string;
  name: string;
  formattedAddress?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  hasPhotos: boolean;
  hasOpeningHours: boolean;
  description?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
}

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const IS_MOCK_MODE = !API_KEY || API_KEY.includes("MockKey") || API_KEY === "";

// Helper delay function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GoogleMapsService {
  /**
   * Search for businesses using Google Places Text Search.
   * Resolves pagination token iteratively to fetch multiple pages of results.
   */
  static async searchBusinesses(
    city: string,
    niche: string,
    limit = 20
  ): Promise<PlaceResult[]> {
    if (IS_MOCK_MODE) {
      console.log(`[GoogleMapsService] Running in MOCK mode for city: ${city}, niche: ${niche}`);
      await sleep(1500); // Simulate network latency
      return this.generateMockPlaces(city, niche, limit);
    }

    const query = `${niche} em ${city}`;
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&language=pt-BR&key=${API_KEY}`;
    
    const results: any[] = [];
    let nextPageToken: string | undefined = undefined;
    let pagesFetched = 0;

    try {
      do {
        if (nextPageToken) {
          // Google Places API requires a 2-second sleep before the token becomes active
          await sleep(2000);
          url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${nextPageToken}&key=${API_KEY}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.status === "OK") {
          results.push(...data.results);
          nextPageToken = data.next_page_token;
          pagesFetched++;
        } else {
          console.error(`[GoogleMapsService] TextSearch failed with status: ${data.status}`, data.error_message);
          break;
        }

        // Limit results to request limits
        if (results.length >= limit || pagesFetched >= 3) {
          break;
        }
      } while (nextPageToken);

      // Map basic results and fetch complete details for each business
      const detailedResults: PlaceResult[] = [];
      // Fetch details in batches of 5 to respect rate limits and speed up execution
      for (let i = 0; i < Math.min(results.length, limit); i++) {
        const place = results[i];
        try {
          const details = await this.getPlaceDetails(place.place_id);
          if (details) {
            detailedResults.push(details);
          }
        } catch (err) {
          console.error(`[GoogleMapsService] Failed to fetch details for place ID ${place.place_id}`, err);
          // Fallback to basic data if details fail
          detailedResults.push({
            placeId: place.place_id,
            name: place.name,
            formattedAddress: place.formatted_address,
            rating: place.rating,
            reviewCount: place.user_ratings_total,
            hasPhotos: !!place.photos && place.photos.length > 0,
            hasOpeningHours: !!place.opening_hours,
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          });
        }
      }

      return detailedResults;
    } catch (err) {
      console.error("[GoogleMapsService] Search query failed", err);
      return [];
    }
  }

  /**
   * Fetch complete details of a specific place ID
   */
  static async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
    if (IS_MOCK_MODE) {
      const mockPlaces = this.generateMockPlaces("MockCity", "MockNiche", 60);
      const matched = mockPlaces.find((p) => p.placeId === placeId);
      return matched || mockPlaces[0];
    }

    const fields = [
      "name",
      "formatted_address",
      "formatted_phone_number",
      "international_phone_number",
      "website",
      "rating",
      "user_ratings_total",
      "opening_hours",
      "photos",
      "editorial_summary",
      "geometry",
      "url",
    ].join(",");

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=pt-BR&key=${API_KEY}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK") {
        const result = data.result;
        return {
          placeId,
          name: result.name,
          formattedAddress: result.formatted_address,
          phone: result.formatted_phone_number || result.international_phone_number,
          website: result.website,
          rating: result.rating,
          reviewCount: result.user_ratings_total || 0,
          hasPhotos: !!result.photos && result.photos.length > 0,
          hasOpeningHours: !!result.opening_hours,
          description: result.editorial_summary?.overview,
          latitude: result.geometry?.location?.lat,
          longitude: result.geometry?.location?.lng,
          googleMapsUrl: result.url || `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        };
      } else {
        console.error(`[GoogleMapsService] Details query for ${placeId} failed: ${data.status}`);
        return null;
      }
    } catch (err) {
      console.error(`[GoogleMapsService] Error querying place details for ${placeId}`, err);
      return null;
    }
  }

  /**
   * Mock data generator for local development and testing
   */
  private static generateMockPlaces(city: string, niche: string, count: number): PlaceResult[] {
    const mockBusinesses = [
      { name: "Pizzaria Bella Napoli", suffix: "e Forneria" },
      { name: "Consultório Odontológico Dra. Sandra", suffix: "e Associados" },
      { name: "Oficina Mecânica Precision Auto", suffix: "Services" },
      { name: "Salão de Beleza Studio Glow Up", suffix: "" },
      { name: "Academia Iron Fitness Center", suffix: "24h" },
      { name: "Pet Shop Amigo Fiel", suffix: "e Clínica Veterinária" },
      { name: "Clínica de Estética Roberta Reis", suffix: "" },
      { name: "Restaurante Sabor Mineiro", suffix: "Self Service" },
      { name: "Hambúrgueria Craft Burger", suffix: "Artesanal" },
      { name: "Cafeteria Grão & Afeto", suffix: "Bistrô" },
      { name: "Marmoraria Cantinho das Pedras", suffix: "" },
      { name: "Advocacia Silveira & Martins", suffix: "Associados" },
      { name: "Imobiliária Novo Lar", suffix: "Negócios" },
      { name: "Serralheria Ferro & Arte", suffix: "" },
      { name: "Confeitaria Doce Magia", suffix: "Ateliê" },
    ];

    const results: PlaceResult[] = [];
    
    // Core center of the city for coordinate offsets
    const baseLat = -20.5375; // Franca-SP lat
    const baseLng = -47.4014; // Franca-SP lng

    for (let i = 0; i < count; i++) {
      const bizIndex = i % mockBusinesses.length;
      const biz = mockBusinesses[bizIndex];
      const name = `${biz.name} ${biz.suffix} (${niche})`;
      
      const id = `mock_place_${niche.toLowerCase().replace(/\s+/g, "_")}_${city.toLowerCase().replace(/\s+/g, "_")}_${i}`;

      // Distribute phone numbers: 80% have it
      const hasPhone = i % 5 !== 0;
      const ddd = city.toLowerCase().includes("franca") ? "16" : "11";
      const phone = hasPhone 
        ? `(${ddd}) 9${Math.floor(8000 + Math.random() * 1999)}-${Math.floor(1000 + Math.random() * 8999)}`
        : undefined;

      // Distribute websites to check all opportunity scorer conditions
      // i % 3 === 0: No site (40 points opportunity)
      // i % 3 === 1: Link to red social (Instagram) as website
      // i % 3 === 2: Proper website
      let website: string | undefined = undefined;
      if (i % 3 === 1) {
        website = `https://instagram.com/${name.toLowerCase().replace(/[^a-z]/g, "")}`;
      } else if (i % 3 === 2) {
        website = `https://www.${name.toLowerCase().replace(/[^a-z]/g, "")}.com.br`;
      }

      // Ratings distribution: some good, some average, some poor
      const ratings = [4.8, 4.5, 3.2, 4.9, 2.8, 3.9, 4.2];
      const rating = ratings[i % ratings.length];

      // Review count
      const reviewCounts = [8, 45, 3, 142, 6, 89, 12];
      const reviewCount = reviewCounts[i % reviewCounts.length];

      // Opening hours, photos, editorial summary
      const hasOpeningHours = i % 4 !== 0;
      const hasPhotos = i % 5 !== 0;
      const description = i % 6 === 0 ? undefined : `O melhor estabelecimento de ${niche} em ${city}. Venha conhecer!`;

      // Coordinates
      const latOffset = (Math.random() - 0.5) * 0.05;
      const lngOffset = (Math.random() - 0.5) * 0.05;

      results.push({
        placeId: id,
        name,
        formattedAddress: `Rua das Flores, ${100 + i * 12}, Centro, ${city} - SP`,
        phone,
        website,
        rating,
        reviewCount,
        hasPhotos,
        hasOpeningHours,
        description,
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset,
        googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${id}`,
      });
    }

    return results;
  }
}
