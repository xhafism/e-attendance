import { NextResponse } from "next/server";
import { authenticateUserByEmail, createSession } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");

  if (error) {
    return new Response(`OAuth Error: ${error} - ${error_description}`, { status: 400 });
  }

  if (!code) {
    return new Response("No authorization code found", { status: 400 });
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID || "556e4561-38a4-4607-a86f-10c54da66f99";
  const tenantId = process.env.MICROSOFT_TENANT_ID || "873d6357-a4ee-4e66-a928-0a973dcd8c67";
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

  if (!clientSecret) {
    console.warn("MICROSOFT_CLIENT_SECRET is missing. OAuth will fail in production.");
    // In dev, if secret is missing we might fail here unless Microsoft app is public client (it usually isn't for web flows)
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret || "",
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("Token exchange failed", errorData);
      return new Response("Failed to exchange authorization code for token", { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch user profile from Microsoft Graph
    const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!graphResponse.ok) {
      return new Response("Failed to fetch user profile", { status: 400 });
    }

    const profile = await graphResponse.json();
    const email = profile.mail || profile.userPrincipalName;
    const name = profile.displayName || email;

    if (!email) {
      return new Response("No email address found in profile", { status: 400 });
    }

    // 3. Authenticate and create session
    const user = await authenticateUserByEmail(email, name);
    await createSession(user.id);

    return NextResponse.redirect(new URL("/", request.url));
  } catch (err: any) {
    console.error("OAuth callback error", err);
    return new Response(`Authentication failed: ${err.message}`, { status: 500 });
  }
}
