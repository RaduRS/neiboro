import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserServiceAdmin } from "@/lib/user-service-admin";
import Link from "next/link";
import NeighborhoodActivity from "@/components/NeighborhoodActivity";

export default async function NeighborhoodPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Basic fallback check - most users should be routed correctly from homepage
  let user;
  try {
    user = await UserServiceAdmin.getByClerkId(userId);
    
    // If user doesn't exist or doesn't have address/cluster, redirect to home
    // The homepage will handle the proper routing
    if (!user || !user.address_line1 || !user.city || !user.cluster_id) {
      redirect("/");
    }
  } catch (error) {
    console.error("Error checking user address:", error);
    // Redirect to home instead of address to let homepage handle routing
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            Welcome to Your Neighborhood! 🏠
          </h1>
          <p className="text-gray-600 text-base sm:text-lg">
            You&apos;re now connected with your local community. Start offering help or request assistance from your neighbors.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Link href="/create-post/offer" className="block">
            <div className="bg-green-500 text-white rounded-2xl p-6 sm:p-8 hover:bg-green-600 transition-colors cursor-pointer touch-manipulation h-full">
              <div className="flex items-center mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl mr-3 sm:mr-4">🤝</span>
                <h2 className="text-xl sm:text-2xl font-semibold">Offer Help</h2>
              </div>
              <p className="text-green-100 mb-3 sm:mb-4 text-sm sm:text-base">
                Share your skills, time, or resources with neighbors who need assistance.
              </p>
              <div className="bg-white text-green-600 px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors text-sm sm:text-base touch-manipulation inline-block">
                Post an Offer
              </div>
            </div>
          </Link>

          <Link href="/create-post/request" className="block">
            <div className="bg-blue-500 text-white rounded-2xl p-6 sm:p-8 hover:bg-blue-600 transition-colors cursor-pointer touch-manipulation h-full">
              <div className="flex items-center mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl mr-3 sm:mr-4">🙋</span>
                <h2 className="text-xl sm:text-2xl font-semibold">Request Help</h2>
              </div>
              <p className="text-blue-100 mb-3 sm:mb-4 text-sm sm:text-base">
                Need assistance with something? Your neighbors are here to help.
              </p>
              <div className="bg-white text-blue-600 px-4 sm:px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm sm:text-base touch-manipulation inline-block">
                Ask for Help
              </div>
            </div>
          </Link>
        </div>

        {/* Real-time Neighborhood Activity */}
        <NeighborhoodActivity userClusterId={user.cluster_id} />
      </div>
    </div>
  );
}