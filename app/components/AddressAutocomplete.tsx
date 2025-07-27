'use client';

import { useState } from 'react';

interface Address {
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

export default function AddressAutocomplete() {
  const [query, setQuery] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (query.length < 2) {
      setError('Please enter at least 2 characters');
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowDropdown(false);
    
    try {
      const response = await fetch(`/api/addresses?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses || []);
        setShowDropdown(true);
        if (data.addresses?.length === 0) {
          setError('No addresses found for this postcode');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch addresses');
        setAddresses([]);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
      setError('Network error - please try again');
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    setQuery(address.full_address);
    setShowDropdown(false);
    setAddresses([]);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">UK Address Finder</h1>
        <p className="text-gray-600">
          Powered by <strong>getAddress.io</strong> - Professional UK address lookup API
        </p>
      </div>

      <div className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter a UK postcode (e.g., SW1A 1AA, M1 1AA, B33 8TH)..."
            className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading || query.length < 2}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isLoading ? (
              <div className="flex items-center space-x-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Search</span>
              </div>
            ) : (
              'Search'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {showDropdown && addresses.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {addresses.map((address) => (
              <button
                key={address.id}
                onClick={() => handleAddressSelect(address)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{address.address}</div>
                <div className="text-sm text-gray-600">
                  {address.city}, {address.postcode}
                  {address.county && `, ${address.county}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedAddress && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Selected Address:</h3>
          <div className="text-green-700">
            <div className="font-medium">{selectedAddress.address}</div>
            <div>{selectedAddress.city}, {selectedAddress.postcode}</div>
            {selectedAddress.county && <div>{selectedAddress.county}</div>}
            <div>{selectedAddress.country}</div>
            {selectedAddress.latitude && selectedAddress.longitude && (
              <div className="text-sm mt-2">
                Coordinates: {selectedAddress.latitude.toFixed(6)}, {selectedAddress.longitude.toFixed(6)}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}