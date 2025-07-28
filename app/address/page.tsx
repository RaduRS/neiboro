'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { ClusterService } from '@/lib/cluster-service';
import AddressInput from '@/components/AddressInput';
import { formatPostcode } from '@/lib/postcode-utils';
import { Address, User, Cluster } from '@/lib/types';

export default function AddressPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [availableCluster, setAvailableCluster] = useState<Cluster | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCluster, setIsCheckingCluster] = useState(false);
  const [showClusterInfo, setShowClusterInfo] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      router.push('/sign-in');
      return;
    }

    // Check if user already has an address
    const checkExistingUser = async () => {
      try {
        const response = await fetch('/api/users/me');
        if (response.ok) {
          const { user: existingUser } = await response.json();
          if (existingUser?.address_line1 && existingUser?.city) {
            router.push('/neighborhood');
          }
        }
      } catch (error) {
        console.error('Error checking existing user:', error);
      }
    };

    checkExistingUser();
  }, [user, isLoaded, router]);

  const handleAddressSelect = async (address: Address) => {
    setSelectedAddress(address);
    setIsCheckingCluster(true);
    setShowClusterInfo(false);

    try {
      // Check if a cluster exists for this postcode
      const cluster = await ClusterService.getClusterForJoining(address.postcode);
      setAvailableCluster(cluster);
      setShowClusterInfo(true);
    } catch (error) {
      console.error('Error checking cluster:', error);
      setAvailableCluster(null);
      setShowClusterInfo(true);
    } finally {
      setIsCheckingCluster(false);
    }
  };

  const handleJoinCluster = async () => {
    if (!user || !selectedAddress || !availableCluster) return;

    setIsLoading(true);
    try {
      // Update or create user with address and cluster via API
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.emailAddresses[0]?.emailAddress || '',
          first_name: user.firstName || '',
          last_name: user.lastName || '',
          profile_image_url: user.imageUrl || '',
          address_line1: selectedAddress.address,
          city: selectedAddress.city,
          cluster_id: availableCluster.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to join cluster');
      }
      
      router.push('/neighborhood');
    } catch (error) {
      console.error('Error joining cluster:', error);
      alert('Failed to join neighborhood. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Find Your Neighborhood
          </h1>
          <p className="text-base sm:text-lg text-gray-600 px-2">
            Enter your address to see if there&apos;s a Neiboro community in your area
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 mb-6">
          <AddressInput
            onAddressSelect={handleAddressSelect}
            placeholder="Enter your full address"
            className="w-full"
            showTitle={false}
          />
        </div>

        {isCheckingCluster && (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
            <div className="text-lg text-gray-600">Checking for available neighborhoods...</div>
          </div>
        )}

        {showClusterInfo && !isCheckingCluster && (
          <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
            {availableCluster ? (
              <div className="text-center">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    🎉 Great news!
                  </h2>
                  <p className="text-base sm:text-lg text-gray-600 mb-4">
                    There&apos;s a Neiboro community in your area
                  </p>
                </div>

                <div className="border-2 border-blue-200 rounded-lg p-6 mb-6 bg-blue-50">
                  <h3 className="text-lg sm:text-xl font-semibold text-blue-900 mb-2">
                    {availableCluster.area_name}
                  </h3>
                  <p className="text-sm sm:text-base text-blue-700 mb-1">
                    Postcode: {formatPostcode(availableCluster.postcode)}
                  </p>
                  <p className="text-sm sm:text-base text-blue-700">
                    Join your local community and start connecting with neighbors
                  </p>
                </div>

                <button
                  onClick={handleJoinCluster}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 text-base sm:text-lg touch-manipulation"
                >
                  {isLoading ? 'Joining...' : 'Join Community'}
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                    Coming Soon! 🚀
                  </h2>
                  <p className="text-base sm:text-lg text-gray-600 mb-4">
                    We&apos;re not in your area yet, but we&apos;re expanding fast
                  </p>
                </div>

                <div className="border-2 border-orange-200 rounded-lg p-6 mb-6 bg-orange-50">
                  <h3 className="text-lg sm:text-xl font-semibold text-orange-900 mb-2">
                    {selectedAddress?.city || 'Your Area'}
                  </h3>
                  <p className="text-sm sm:text-base text-orange-700 mb-3">
                    Postcode: {formatPostcode(selectedAddress?.postcode || '')}
                  </p>
                  <p className="text-sm sm:text-base text-orange-700">
                    We&apos;ll notify you as soon as Neiboro launches in your neighborhood
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      // You could implement a waitlist signup here
                      alert('Thanks for your interest! We&apos;ll notify you when we launch in your area.');
                    }}
                    className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 text-base sm:text-lg touch-manipulation"
                  >
                    Join Waitlist
                  </button>
                  <div className="text-sm text-gray-500">
                    or try a different address
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}