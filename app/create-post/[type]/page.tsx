'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export default function CreatePostPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });

  const postType = params?.type as string;
  const isOffer = postType === 'offer';
  const isRequest = postType === 'request';

  // Redirect if invalid type
  if (!isOffer && !isRequest) {
    router.push('/neighborhood');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          post_type: isOffer ? 'help_offered' : 'help_needed'
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Redirect back to neighborhood page
        router.push('/neighborhood');
      } else {
        // Handle different error types
        if (response.status === 429) {
          alert('You\'re creating posts too quickly. Please wait a moment before trying again.');
        } else if (response.status === 403) {
          alert(result.error || 'You must join a neighborhood before creating posts.');
        } else {
          alert(result.error || 'Failed to create post');
        }
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6 sm:mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.back()}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-xl">←</span>
            </button>
            <div className="flex items-center">
              <span className="text-2xl sm:text-3xl mr-3 sm:mr-4">
                {isOffer ? '🤝' : '🙋'}
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {isOffer ? 'Offer Help' : 'Request Help'}
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  {isOffer 
                    ? 'Share how you can help your neighbors'
                    : 'Let your neighbors know what you need help with'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder={isOffer 
                  ? "e.g., I can help with grocery shopping"
                  : "e.g., Need help moving furniture"
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={isOffer 
                  ? "Describe what kind of help you can offer, when you're available, and any other relevant details..."
                  : "Describe what you need help with, when you need it, and any other relevant details..."
                }
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base resize-vertical"
                maxLength={500}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.title.trim() || !formData.description.trim()}
                className={`w-full sm:w-auto px-8 py-3 rounded-lg font-medium transition-colors ${
                  isOffer
                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
                } text-white disabled:cursor-not-allowed`}
              >
                {isLoading ? 'Creating...' : `Post ${isOffer ? 'Offer' : 'Request'}`}
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            💡 Tips for a great post
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">•</span>
              Be specific about what you&apos;re {isOffer ? 'offering' : 'requesting'}
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">•</span>
              Include when you&apos;re available or when you need help
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">•</span>
              Be friendly and respectful in your communication
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">•</span>
              {isOffer 
                ? 'Let neighbors know any limitations or requirements'
                : 'Mention if you can offer anything in return'
              }
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}