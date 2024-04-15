import { compressor, decompressor, simpleHash } from "./compress";
import { renderer } from "./render";

export type Env = {
    MY_BROWSER: Fetcher;
    KV1: KVNamespace;
    URL_ORIGIN: string | undefined;
};

export type Container = {
    expr: string;
};

type Value = {
    expr: string;
    img: ArrayBuffer;
};

const retrieveFromKV = async (key: string, env: Env): Promise<Value | null> => {
    const value = (await env.KV1.get(key, {
        type: "json",
    })) as Value | null; // TODO validate

    return value;
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
        case "/v0": {
            if (request.method !== "GET") {
                return new Response("Method not allowed", { status: 405 });
            }

            const { searchParams } = url;

            const container: Container = await (async () => {
                const containerParam = searchParams.get("c");
                if (containerParam !== null) {
                    const dc = await decompressor(
                        decodeURIComponent(containerParam),
                    );
                    return dc;
                }

                const exprParam = searchParams.get("expr");
                let expr =
                    exprParam ??
                    String.raw`
                        \text{数式}\
                        \left( \int_0^\infty \frac{\sin x}{\sqrt{x}} dx \right)^2 = \sum_{k=0}^\infty \frac{(2k)!}{2^{2k}(k!)^2} \frac{1}{2k+1} =
                        \prod_{k=1}^\infty \frac{4k^2}{4k^2 - 1} = \frac{\pi}{2}
                        \ \text{とタイムスタンプ🕒}\
                    ` + new Date().getTime();
                expr = expr.trim();

                return {
                    expr,
                } satisfies Container;
            })();

            // const key = simpleHash(JSON.stringify(container)).toString("hex");
            const key = simpleHash(container.expr).toString("hex");

            const value = await retrieveFromKV(key, env);

            if (value !== null) {
                return new Response(value.img, {
                    status: 200,
                    headers: {
                        "Content-Type": "image/svg+xml",
                    },
                });
            }

            let img: Buffer;
            try {
                img = await renderer(container.expr, env, ctx);
            } catch (e) {
                console.error(e);
                return new Response("Internal Server Error", { status: 500 });
            }

            const newValue = {
                expr: container.expr,
                img,
            } satisfies Value;

            console.log("putting", { key });
            await env.KV1.put(key, JSON.stringify(newValue), {
                // expirationTtl: 60 * 60 * 24,
                expirationTtl: 60,
            });

            const cc = await compressor(container);
            const redirectUrl = new URL(getCurrentUrlOrigin(url, env));
            redirectUrl.pathname = "/v0";
            redirectUrl.searchParams.set("c", encodeURIComponent(cc));

            return Response.redirect(redirectUrl.toString(), 302);
        }
        default:
            return new Response("Not found", { status: 404 });
    }
};

export default {
    fetch,
};

const getCurrentUrlOrigin = (url: URL, env: Env): string => {
    if (env.URL_ORIGIN !== undefined) {
        return env.URL_ORIGIN;
    }
    return url.origin;
};
