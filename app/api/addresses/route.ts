import { NextRequest, NextResponse } from 'next/server';

interface AddressResult {
  id: string;
  address: string;
  city: string;
  postcode: string;
  county: string;
  country: string;
  full_address: string;
  latitude?: number;
  longitude?: number;
}

// getAddress.io API response interfaces
interface GetAddressResponse {
  postcode: string;
  latitude: number;
  longitude: number;
  addresses: GetAddressAddress[];
}

interface GetAddressAddress {
  formatted_address: string[];
  thoroughfare: string;
  building_name: string;
  sub_building_name: string;
  sub_building_number: string;
  building_number: string;
  line_1: string;
  line_2: string;
  line_3: string;
  line_4: string;
  locality: string;
  town_or_city: string;
  county: string;
  district: string;
  country: string;
  residential: boolean;
}

interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
}

interface AutocompleteSuggestion {
  address: string;
  url: string;
  id: string;
}

// Function to convert getAddress.io response to our format
function convertGetAddressToResult(getAddressData: GetAddressResponse): AddressResult[] {
  return getAddressData.addresses.map((addr, index) => {
    // Build full address from formatted_address array
    const fullAddress = addr.formatted_address
      .filter(line => line && line.trim() !== '')
      .join(', ');

    // Use line_1 as primary address, fallback to building info
    const primaryAddress = addr.line_1 || 
      [addr.sub_building_name, addr.building_name, addr.building_number, addr.thoroughfare]
        .filter(part => part && part.trim() !== '')
        .join(' ');

    return {
      id: `getaddress-${index}-${Math.random().toString(36).substr(2, 6)}`,
      address: primaryAddress || addr.formatted_address[0] || '',
      city: addr.town_or_city || addr.locality || '',
      postcode: getAddressData.postcode,
      county: addr.county || addr.district || '',
      country: addr.country || 'United Kingdom',
      full_address: fullAddress,
      latitude: getAddressData.latitude,
      longitude: getAddressData.longitude
    };
  });
}

async function convertAutocompleteToResult(suggestions: AutocompleteSuggestion[], apiKey: string, postcode: string): Promise<AddressResult[]> {
  const addresses: AddressResult[] = [];
  
  // Use the address data directly from autocomplete suggestions
  // No need to make individual API calls since we already have the formatted addresses
  for (const suggestion of suggestions) {
    try {
      // Parse the formatted address string
      // Format: "5 Great Northern Road, Eastwood, Nottingham, Nottinghamshire, NG16 3PD"
      const addressParts = suggestion.address.split(', ');
      
      // Extract components
      const streetAddress = addressParts[0] || '';
      const locality = addressParts[1] || '';
      const city = addressParts[2] || '';
      const county = addressParts[3] || '';
      const extractedPostcode = addressParts[4] || postcode;
      
      addresses.push({
        id: `getaddress-${suggestion.id}`,
        address: streetAddress,
        city: city,
        postcode: extractedPostcode,
        county: county,
        country: 'United Kingdom',
        full_address: suggestion.address,
        // Note: Autocomplete API doesn't provide lat/lng, but we can add them later if needed
        latitude: undefined,
        longitude: undefined
      });
    } catch (error) {
      console.warn(`Error parsing address suggestion: ${suggestion.address}`, error);
    }
  }
  
  return addresses;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  // Check if query looks like a UK postcode
  const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
  if (!postcodeRegex.test(query.trim())) {
    return NextResponse.json({ addresses: [] });
  }

  // Get API key from environment
  const apiKey = process.env.GETADDRESS_API_KEY;
  if (!apiKey) {
    console.error('GETADDRESS_API_KEY not found in environment variables');
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    // Clean and format postcode
    const cleanPostcode = query.replace(/\s/g, '').toUpperCase();
    
    // Try to format postcode with space (getAddress.io might expect this format)
    let formattedPostcode = cleanPostcode;
    if (cleanPostcode.length >= 5) {
      // Insert space before last 3 characters (e.g., NG163PD -> NG16 3PD)
      formattedPostcode = cleanPostcode.slice(0, -3) + ' ' + cleanPostcode.slice(-3);
    }
    
    // Use Autocomplete API for postcode searches with all=true parameter
    // This is more reliable for postcode lookups than the Find API
    const url = `https://api.getaddress.io/autocomplete/${encodeURIComponent(formattedPostcode)}?api-key=${apiKey}&all=true`;
    
    console.log(`Fetching from getAddress.io Autocomplete API for postcode: ${cleanPostcode} (formatted as: ${formattedPostcode})`);
    console.log(`Full URL: ${url.replace(apiKey, 'HIDDEN_API_KEY')}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Neiboro-Address-Lookup/1.0'
      }
    });

    console.log(`getAddress.io response status: ${response.status}`);

    if (!response.ok) {
      if (response.status === 401) {
        console.error('getAddress.io API key is invalid');
        return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
      } else if (response.status === 404) {
        console.log(`No addresses found for postcode: ${cleanPostcode} (404 response)`);
        const errorText = await response.text();
        console.log(`getAddress.io 404 response body: ${errorText}`);
        return NextResponse.json({ addresses: [] });
      } else if (response.status === 429) {
        console.error('getAddress.io API rate limit exceeded');
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      } else {
        const errorText = await response.text();
        console.error(`getAddress.io error response: ${response.status} - ${errorText}`);
        throw new Error(`getAddress.io request failed: ${response.status}`);
      }
    }

    const data: AutocompleteResponse = await response.json();
    console.log(`Raw getAddress.io Autocomplete response:`, JSON.stringify(data, null, 2));
    
    if (!data.suggestions || data.suggestions.length === 0) {
      console.log(`No suggestions found for postcode: ${cleanPostcode}`);
      return NextResponse.json({ addresses: [] });
    }

    // Convert autocomplete suggestions to our format
    const addresses = await convertAutocompleteToResult(data.suggestions, apiKey, formattedPostcode);
    
    console.log(`Found ${addresses.length} addresses for postcode: ${cleanPostcode}`);
    
    return NextResponse.json({ addresses });

  } catch (error) {
    console.error('Error fetching addresses from getAddress.io:', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}