import { simpleHash } from "./compress";
import { renderer } from "./render";

export type Env = {
    MY_BROWSER: Fetcher;
    KV1: KVNamespace;
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

            const keyParam = searchParams.get("key");
            if (keyParam !== null) {
                const value = await retrieveFromKV(keyParam, env);

                if (value === null) {
                    return new Response("Not found", { status: 404 });
                }

                return new Response(value.img, {
                    status: 200,
                    headers: {
                        "Content-Type": "image/svg+xml",
                    },
                });
            }

            const exprParam = searchParams.get("expr");
            let expr =
                exprParam ??
                String.raw` \left( \int_0^\infty \frac{\sin x}{\sqrt{x}} dx \right)^2 = \sum_{k=0}^\infty \frac{(2k)!}{2^{2k}(k!)^2} \frac{1}{2k+1} =
                    \prod_{k=1}^\infty \frac{4k^2}{4k^2 - 1} = \frac{\pi}{2}
                    \text{日本語のテキスト😀}
                ` + new Date().getTime();
            expr = expr.trim();

            const container = {
                expr,
            } satisfies Container;

            const key = simpleHash(JSON.stringify(container)).toString(
                "base64",
            );

            const value = await retrieveFromKV(key, env);

            if (value !== null) {
                return new Response(value.img, {
                    status: 200,
                    headers: {
                        "Content-Type": "image/svg+xml",
                    },
                });
            }

            const img = await renderer(expr, env, ctx);

            const newValue = {
                expr: container.expr,
                img,
            } satisfies Value;
            await env.KV1.put(key, JSON.stringify(newValue), {
                expirationTtl: 60 * 60 * 24,
            });

            return new Response(img, {
                status: 200,
                headers: {
                    "Content-Type": "image/svg+xml",
                },
            });
        }
        default:
            return new Response("Not found", { status: 404 });
    }
};

export default {
    fetch,
};
