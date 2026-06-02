import { NextResponse } from "next/server";
import manifest from "./manifest.json";

// Serves the EXISTING, already-signed Farcaster manifest verbatim at
// /.well-known/farcaster.json. The accountAssociation is signed over the
// domain (snakenokiabase.vercel.app), so reusing the bytes as-is is valid as
// long as the production domain is unchanged. Nothing here is re-signed.
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(manifest);
}
