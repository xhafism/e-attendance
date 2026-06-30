import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.MICROSOFT_CLIENT_ID || "556e4561-38a4-4607-a86f-10c54da66f99";
  const tenantId = process.env.MICROSOFT_TENANT_ID || "873d6357-a4ee-4e66-a928-0a973dcd8c67";
  
  const url = new URL(request.url);
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${url.origin}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile email User.Read",
    response_mode: "query",
  });

  const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
