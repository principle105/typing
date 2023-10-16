import { dev } from "$app/environment";
import { discordAuth } from "$lib/server/lucia";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ cookies }) => {
    const [url, state] = await discordAuth.getAuthorizationUrl();

    cookies.set("discord_oauth_state", state, {
        httpOnly: true,
        secure: !dev,
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
    });

    return new Response(null, {
        status: 302,
        headers: {
            location: url.toString(),
        },
    });
};
