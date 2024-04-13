import { compressor, decompressor } from "./compressor";
import { renderer } from "./renderer";

export type Env = {
    MY_BROWSER: Fetcher;
    KV1: KVNamespace;
};

export type Container = {
    expr: string;
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
            let expr =
                String.raw` \left( \int_0^\infty \frac{\sin x}{\sqrt{x}} dx \right)^2 = \sum_{k=0}^\infty \frac{(2k)!}{2^{2k}(k!)^2} \frac{1}{2k+1} =
                    \prod_{k=1}^\infty \frac{4k^2}{4k^2 - 1} = \frac{\pi}{2}
                    \text{2日本語のテキスト😀}
                    \text{3日本語のテキスト😀}
                    \text{4日本語のテキスト😀}
                    \text{5日本語のテキスト😀}
                    \text{6日本語のテキスト😀}
                    \text{7日本語のテキスト😀}
                    \text{8日本語のテキスト😀}
                    \text{9日本語のテキスト😀}
                    \text{10日本語のテキスト😀}
                    \text{11日本語のテキスト😀}
                    \text{12日本語のテキスト😀}
                ` + new Date().getTime();
            // expr = "";
            expr = expr.trim();
            expr = expr.repeat(100);

            const container = {
                expr,
            } satisfies Container;
            const compressed = await compressor(container);
            const decompressed = await decompressor(compressed);

            const res = {
                container,
                compressed,
                compressedLength: compressed.length,
                exprLength: expr.length,
                decompressed,
                isMatched:
                    JSON.stringify(container) === JSON.stringify(decompressed),
            };

            return new Response(JSON.stringify(res), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            });
        }
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
