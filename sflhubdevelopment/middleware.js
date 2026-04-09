import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
        Protect everything except:
        - static files
        - images
        - favicon
      */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
