# Neiboro - Neighborhood Help Platform

A Next.js application that connects neighbors to offer and request help within their local community.

## Features

- **User Authentication**: Secure sign-up/sign-in with Clerk
- **Address Lookup**: UK address verification and autocomplete
- **Help Posts**: Create offers and requests for neighborhood assistance
- **Community Focus**: Connect with neighbors in your postcode area
- **Real-time Sync**: Automatic user data synchronization between Clerk and Supabase

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **Address API**: GetAddress.io
- **Webhooks**: Svix for Clerk integration

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Geocoding API
GEOAPIFY_API_KEY=your_geoapify_key
GETADDRESS_API_KEY=your_getaddress_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/neighborhood
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/neighborhood
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase/schema.sql` in your Supabase SQL editor
3. This will create all necessary tables, indexes, and Row Level Security policies

### 4. Clerk Webhook Setup

1. In your Clerk dashboard, go to Webhooks
2. Create a new webhook endpoint pointing to: `https://yourdomain.com/api/webhook/clerk`
3. Select the following events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
4. Copy the webhook secret to your `CLERK_WEBHOOK_SECRET` environment variable

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Database Schema

### Users Table
- Stores user profile information synced from Clerk
- Includes address fields for neighborhood matching

### Posts Table
- Help offers and requests from community members
- Categorized and location-based filtering

### Post Responses Table
- Responses to help posts
- Status tracking (pending, accepted, declined)

### Neighborhoods Table
- Postcode-based community groupings
- Automatic neighborhood assignment

## API Endpoints

- `GET /api/addresses` - UK address lookup and autocomplete
- `POST /api/webhook/clerk` - Clerk user synchronization webhook

## Key Components

- `AddressInput` - UK address finder with autocomplete
- `HomeHeader` - Landing page header with community messaging
- `HomeContent` - Main content showcasing help features
- Authentication pages with community-focused design

## Services

- `UserService` - User CRUD operations and Clerk integration
- `PostService` - Post management and neighborhood filtering

## Development

The application follows these principles:
- **Separation of Concerns**: Clear separation between UI, data, and API layers
- **DRY Principle**: Reusable components and centralized types
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Type Safety**: Full TypeScript coverage with proper interfaces

## Contributing

1. Follow the existing code style and patterns
2. Ensure all components are responsive
3. Add proper TypeScript types for new features
4. Test authentication flows thoroughly