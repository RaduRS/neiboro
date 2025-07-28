import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { UserServiceAdmin } from "@/lib/user-service-admin";
import { ClerkWebhookEvent } from "@/lib/types";

export async function POST(req: Request) {
  // Get the headers - make sure to await
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the webhook secret from the environment
  const secret = process.env.CLERK_WEBHOOK_SECRET || "";

  // Create a new Svix instance with the secret
  const wh = new Webhook(secret);

  let evt: ClerkWebhookEvent;

  try {
    // Verify the webhook
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new NextResponse("Error occurred", {
      status: 400,
    });
  }

  // Get the event type and data
  const { type, data } = evt;

  // Handle user creation and updates
  if (type === "user.created" || type === "user.updated") {
    const {
      id: clerkId,
      email_addresses,
      first_name,
      last_name,
      image_url,
    } = data;

    try {
      // Get the email if available
      const email =
        email_addresses?.length > 0
          ? email_addresses[0].email_address
          : `user-${clerkId}@example.com`;

      // Check if user already exists by clerkId
      let existingUser;
      try {
        existingUser = await UserServiceAdmin.getByClerkId(clerkId);
      } catch (error) {
        console.error("Error checking existing user:", error);
        // If we can't check for existing user, assume they don't exist
        existingUser = null;
      }

      if (existingUser) {
        // Only update users that already exist
        if (type === "user.updated") {
          try {
            await UserServiceAdmin.update(clerkId, {
              first_name: first_name || existingUser.first_name || undefined,
              last_name: last_name || existingUser.last_name || undefined,
              profile_image_url: image_url || existingUser.profile_image_url || undefined,
              // Don't update email as it could cause conflicts
            });
          } catch (updateError) {
            console.error("Error updating user:", updateError);
            // Don't fail the webhook if update fails
          }
        }
      } else {
        // Create new user only for user.created events
        if (type === "user.created") {
          try {
            await UserServiceAdmin.create({
              clerk_id: clerkId,
              email,
              first_name: first_name || "",
              last_name: last_name || "",
              profile_image_url: image_url || "",
            });
          } catch (createError) {
            console.error("Error creating user:", createError);
            // Don't fail the webhook if create fails
          }
        }
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error handling webhook:", error);
      return NextResponse.json({ success: false }, { status: 500 });
    }
  }

  // Handle user deletion
  if (type === "user.deleted") {
    const { id: clerkId } = data;

    try {
      await UserServiceAdmin.delete(clerkId);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json({ success: false }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}