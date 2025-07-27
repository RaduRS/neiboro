// Frontend types
export interface Address {
  id: string;
  address: string;
  city: string;
  postcode: string;
  county: string;
  country: string;
  full_address: string;
}

// API types
export interface AddressResult {
  id: string;
  address: string;
  city: string;
  postcode: string;
  county: string;
  country: string;
  full_address: string;
}

export interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
}

export interface AutocompleteSuggestion {
  address: string;
  url: string;
  id: string;
}

// User types
export interface User {
  id: string;
  clerk_id: string;
  cluster_id?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

// Cluster types
export interface Cluster {
  id: string;
  postcode: string;
  area_name?: string;
  city?: string;
  county?: string;
  country?: string;
  created_at: string;
  updated_at: string;
}

// Post types
export interface Post {
  id: string;
  user_id: string;
  title: string;
  description: string;
  post_type: 'help_needed' | 'help_offered';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: User; // Optional populated user data
}

// Post response types (for "I can help" interactions)
export interface PostResponse {
  id: string;
  post_id: string;
  user_id: string;
  response_type: 'offer_help' | 'comment';
  message?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  user?: User; // Optional populated user data
  post?: Post; // Optional populated post data
}

// Chat session types (for private conversations)
export interface ChatSession {
  id: string;
  post_response_id: string;
  post_owner_id: string;
  helper_id: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  post_response?: PostResponse; // Optional populated post response data
  post_owner?: User; // Optional populated post owner data
  helper?: User; // Optional populated helper data
  latest_message?: ChatMessage; // Optional latest message
  unread_count?: number; // Optional unread message count
}

// Chat message types
export interface ChatMessage {
  id: string;
  chat_session_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: User; // Optional populated sender data
}

// Neighborhood types
export interface Neighborhood {
  id: string;
  postcode: string;
  area_name?: string;
  created_at: string;
  updated_at: string;
}

// User neighborhood relationship
export interface UserNeighborhood {
  id: string;
  user_id: string;
  neighborhood_id: string;
  created_at: string;
  user?: User;
  neighborhood?: Neighborhood;
}

// Clerk webhook event types
export interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    public_metadata?: Record<string, unknown>;
    private_metadata?: Record<string, unknown>;
    unsafe_metadata?: Record<string, unknown>;
  };
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form Data Types
export interface CreateUserData {
  clerk_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  cluster_id?: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  cluster_id?: string;
  role?: 'user' | 'admin';
}

export interface CreatePostData {
  title: string;
  description: string;
  post_type: 'help_needed' | 'help_offered';
}

export interface UpdatePostData {
  title?: string;
  description?: string;
  post_type?: 'help_needed' | 'help_offered';
  is_active?: boolean;
}

export interface CreatePostResponseData {
  post_id: string;
  response_type: 'offer_help' | 'comment';
  message?: string;
}

export interface CreateChatSessionData {
  post_response_id: string;
  helper_id: string;
}

export interface CreateChatMessageData {
  chat_session_id: string;
  message: string;
}

// Address lookup types (for GetAddress.io API)
export interface AddressLookupResult {
  formatted_address: string[];
  thoroughfare: string;
  building_name: string;
  sub_building_name: string;
  sub_building_number: string;
  building_number: string;
  line_1: string;
  line_2: string;
  line_3: string;
  line_4: string;
  locality: string;
  town_or_city: string;
  county: string;
  district: string;
  country: string;
  postcode: string;
}

// Component Props Types
export interface AddressInputProps {
  onAddressSelect?: (address: Address) => void;
  initialValue?: string;
  placeholder?: string;
  className?: string;
  showTitle?: boolean;
}