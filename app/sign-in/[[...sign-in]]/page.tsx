import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Sign in to connect with your neighbors
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white touch-manipulation",
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
            New to Neiboro?{" "}
            <Link href="/sign-up" className="text-blue-600 hover:text-blue-700 font-medium touch-manipulation">
              Join your neighborhood
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}