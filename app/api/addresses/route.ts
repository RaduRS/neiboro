import { NextRequest, NextResponse } from 'next/server';
import { AddressResult, AutocompleteResponse, AutocompleteSuggestion } from '@/lib/types';

function handleApiError(status: number, cleanPostcode: string): NextResponse {
  switch (status) {
    case 401:
      console.error('getAddress.io API key is invalid');
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    case 404:
      console.log(`No addresses found for postcode: ${cleanPostcode}`);
      return NextResponse.json({ addresses: [] });
    case 429:
      console.error('getAddress.io API rate limit exceeded');
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    default:
      console.error(`getAddress.io error response: ${status}`);
      throw new Error(`getAddress.io request failed: ${status}`);
  }
}

function convertAutocompleteToResult(suggestions: AutocompleteSuggestion[], postcode: string): AddressResult[] {
  return suggestions.map(suggestion => {
    try {
      // Parse the formatted address string
      // Format: "5 Great Northern Road, Eastwood, Nottingham, Nottinghamshire, NG16 3PD"
      const addressParts = suggestion.address.split(', ');
      
      return {
        id: `getaddress-${suggestion.id}`,
        address: addressParts[0] || '',
        city: addressParts[2] || '',
        postcode: addressParts[4] || postcode,
        county: addressParts[3] || '',
        country: 'United Kingdom',
        full_address: suggestion.address
      };
    } catch (error) {
      console.warn(`Error parsing address suggestion: ${suggestion.address}`, error);
      return {
        id: `getaddress-${suggestion.id}`,
        address: suggestion.address,
        city: '',
        postcode: postcode,
        county: '',
        country: 'United Kingdom',
        full_address: suggestion.address
      };
    }
  });
}

function formatPostcode(query: string): { clean: string; formatted: string } {
  const clean = query.replace(/\s/g, '').toUpperCase();
  const formatted = clean.length >= 5 
    ? clean.slice(0, -3) + ' ' + clean.slice(-3)
    : clean;
  
  return { clean, formatted };
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

  const apiKey = process.env.GETADDRESS_API_KEY;
  if (!apiKey) {
    console.error('GETADDRESS_API_KEY not found in environment variables');
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    const { clean: cleanPostcode, formatted: formattedPostcode } = formatPostcode(query);
    
    const url = `https://api.getaddress.io/autocomplete/${encodeURIComponent(formattedPostcode)}?api-key=${apiKey}&all=true`;
    
    console.log(`Fetching addresses for postcode: ${cleanPostcode} (formatted as: ${formattedPostcode})`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Neiboro-Address-Lookup/1.0'
      }
    });

    if (!response.ok) {
      return handleApiError(response.status, cleanPostcode);
    }

    const data: AutocompleteResponse = await response.json();
    
    if (!data.suggestions?.length) {
      console.log(`No suggestions found for postcode: ${cleanPostcode}`);
      return NextResponse.json({ addresses: [] });
    }

    const addresses = convertAutocompleteToResult(data.suggestions, formattedPostcode);
    
    console.log(`Found ${addresses.length} addresses for postcode: ${cleanPostcode}`);
    
    return NextResponse.json({ addresses });

  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
  }
}