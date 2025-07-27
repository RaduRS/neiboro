Neiboro Platform: Complete User Workflow
This workflow outlines the entire user journey, detailing the actions taken by the user and the corresponding system responses, all based on the production-ready Supabase schema we finalized.

Workflow 1: User Onboarding & Registration
The goal is to securely register a new user and verify they belong to a specific neighborhood cluster.

Step 1: User Signs Up via Clerk

User Action: A new visitor clicks "Sign Up."

System Action: The user is redirected to the Clerk-hosted sign-up page. Clerk handles the entire authentication process (e.g., email/password or social login). Upon successful authentication, Clerk creates a user record and provides a unique clerk_id.

Step 2: User Completes Their Neiboro Profile

User Action: After authentication, the user is redirected back to Neiboro, to a one-time setup page (e.g., /profile/setup). They are prompted to enter their UK address to join their neighborhood cluster.

System Action: The address input form uses a Postcode Lookup API (like getAddress.io or a similar service). As the user types their postcode, the API suggests valid addresses.

Step 3: User Joins a Cluster

User Action: The user selects their exact address from the list.

System Action (Backend Logic):

The system checks the clusters table to see if a record exists for the selected postcode.

If no clusters record exists, it creates a new one.

A new record is created in the users table. This record is populated with:

The clerk_id from Clerk.

The email and first_name from Clerk.

The full address details (address_line1, address_line2, city).

The cluster_id from the corresponding record in the clusters table.

Outcome: The user is now a fully registered and verified member of a specific neighborhood cluster. They are redirected to the main bulletin board and can see posts from their neighbors.

Workflow 2: The Core Loop: A Neighbor Needs Help
This covers the process from a user posting a request to getting help.

Step 1: Sarah Posts a "Help Needed" Request

User Action: Sarah, a logged-in user, clicks "New Post." She fills out a form with a Title ("Help moving a couch"), Description, and selects the post_type as 'help_needed'.

System Action: A new record is created in the posts table with Sarah's user_id. The post is now visible on the bulletin board, but only to other users who share the same cluster_id (enforced by RLS).

Step 2: David Offers to Help

User Action: David, Sarah's neighbor, sees her post and clicks the "I can help!" button.

System Action:

A new record is created in the post_responses table with post_id (Sarah's post), user_id (David's ID), and status set to 'pending'.

A push notification and/or email is sent to Sarah: "David has offered to help with your post: 'Help moving a couch'."

Step 3: Sarah Accepts David's Offer

User Action: Sarah views her post's details, sees a list of offers, and clicks "Accept" next to David's name.

System Action:

The post_responses record for David is updated to status = 'accepted'.

A new record is created in the chat_sessions table. This record links Sarah (post_owner_id), David (helper_id), and the post_id. This action officially opens a private communication channel.

A notification is sent to David: "Sarah has accepted your offer! You can now chat with her to coordinate."

Step 4: Sarah and David Connect Privately

User Action: Both Sarah and David now have access to a private chat page for this specific request. Sarah can safely share details like "Thanks! We're at number 22. Would 10 AM on Saturday work?"

System Action: Every message sent creates a new record in the chat_messages table, linked to the chat_session_id. Supabase's real-time subscriptions will display new messages instantly without needing a page refresh.

Step 5: The Post is Resolved

User Action: After the help is complete, Sarah can mark the original post as "Completed" or "Inactive."

System Action: The is_active field on the posts table is set to false. The post may be archived or hidden from the main feed. The chat session remains accessible for their records.

