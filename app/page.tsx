import AddressAutocomplete from './components/AddressAutocomplete';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Find Your Address
          </h1>
          <AddressAutocomplete />
        </div>
      </div>
    </div>
  );
}
