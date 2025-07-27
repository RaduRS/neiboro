"use client";

import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import HomeHeader from '@/components/HomeHeader';
import HomeContent from '@/components/HomeContent';
import { UserService } from '@/lib/user-service';

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      // User is signed in, check their address status
      setIsCheckingUser(true);
      
      const checkUserStatus = async () => {
        try {
          const existingUser = await UserService.getByClerkId(user.id);
          
          if (existingUser?.address_line1 && existingUser?.city && existingUser?.cluster_id) {
            // User has complete address setup, go to neighborhood
            router.push('/neighborhood');
          } else {
            // User needs to set up address
            router.push('/address');
          }
        } catch (error) {
          console.error('Error checking user status:', error);
          // If there's an error, redirect to address setup to be safe
          router.push('/address');
        } finally {
          setIsCheckingUser(false);
        }
      };

      checkUserStatus();
    }
  }, [user, isLoaded, router]);

  // Show loading state while checking user status
  if (!isLoaded || (user && isCheckingUser)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">
            {user ? 'Setting up your neighborhood...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show homepage for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <HomeHeader />
        <HomeContent />
      </div>
    </div>
  );
}
