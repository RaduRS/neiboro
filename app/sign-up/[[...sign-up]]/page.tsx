import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Join Your Neighborhood</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Start helping and getting help from your neighbors
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <SignUp 
            appearance={{
              elements: {
                formButtonPrimary: "bg-green-600 hover:bg-green-700 text-white touch-manipulation",
                card: "shadow-none",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                formFieldInput: "text-base",
              }
            }}
          />
        </div>
        
        <div className="text-center mt-4 sm:mt-6">
          <p className="text-xs sm:text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-green-600 hover:text-green-700 font-medium touch-manipulation">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}