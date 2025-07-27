export default function HomeContent() {
  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Main Value Proposition */}
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
          Real Help from Real Neighbors
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Offer Help Section */}
          <div className="bg-green-50 rounded-xl p-4 sm:p-6">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                <span className="text-white text-lg sm:text-xl">🤝</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Offer Help
              </h3>
            </div>
            <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
              Share your skills and time with neighbors who need it most.
            </p>
            <ul className="space-y-1 sm:space-y-2 text-gray-600 text-sm sm:text-base">
              <li>• Help with shopping or errands</li>
              <li>• Offer rides to appointments</li>
              <li>• Share tools or equipment</li>
              <li>• Provide childcare support</li>
              <li>• Assist elderly neighbors</li>
              <li>• Help with home repairs</li>
            </ul>
          </div>

          {/* Request Help Section */}
          <div className="bg-blue-50 rounded-xl p-4 sm:p-6">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                <span className="text-white text-lg sm:text-xl">🙋</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                Request Help
              </h3>
            </div>
            <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
               Don&apos;t struggle alone. Your neighbors want to help.
             </p>
            <ul className="space-y-1 sm:space-y-2 text-gray-600 text-sm sm:text-base">
              <li>• Need groceries picked up</li>
              <li>• Looking for a babysitter</li>
              <li>• Need help moving furniture</li>
              <li>• Seeking pet care while away</li>
              <li>• Need a ride to the doctor</li>
              <li>• Looking to borrow tools</li>
            </ul>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4 sm:mb-6 text-center">
          How Neighbors Help Each Other
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="text-purple-600 text-xl sm:text-2xl">🏠</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
              Join Your Street
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              Connect with neighbors on your street and nearby streets for a trusted, local community.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="text-orange-600 text-xl sm:text-2xl">💬</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
              Post & Respond
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              Share what you need or offer what you can give. Real people, real help, real community.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <span className="text-red-600 text-xl sm:text-2xl">❤️</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
              Build Relationships
            </h3>
            <p className="text-gray-600 text-xs sm:text-sm">
              Turn strangers into friends. Create the community you want to live in.
            </p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center">
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-2xl p-6 sm:p-8">
          <h3 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
            Ready to Help Your Neighbors?
          </h3>
          <p className="text-green-100 mb-4 sm:mb-6 max-w-2xl mx-auto text-sm sm:text-base">
            Neiboro brings back the spirit of community. Whether you need help or want to help others, 
            your neighbors are just around the corner.
          </p>
          <button
            className="bg-white text-green-600 px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:bg-green-50 transition-colors text-sm sm:text-base touch-manipulation"
            disabled
          >
            Join Your Neighborhood
          </button>
          <p className="text-green-100 text-xs sm:text-sm mt-2 sm:mt-3">
            Currently in development
          </p>
        </div>
      </div>
    </div>
  );
}