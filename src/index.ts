import { renderer } from "./renderer";

export type Env = {
    MY_BROWSER: Fetcher;
};

const fetch = async (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
): Promise<Response> => {
    const url = new URL(request.url);

    switch (url.pathname) {
        case "/health":
            return new Response("OK", { status: 200 });
        case "/":
            if (request.method === "GET") {
                return new Response(await renderer(env, ctx), {
                    headers: {
                        // "Content-Type": "image/png",
                        "Content-Type": "image/svg+xml",
                    },
                    status: 200,
                });
            }
            return new Response("Method not allowed", { status: 405 });
        default:
            return new Response("Not found", { status: 404 });
    }
};

export default {
    fetch,
};
