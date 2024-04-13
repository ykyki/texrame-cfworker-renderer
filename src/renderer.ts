import type { Buffer } from "node:buffer";
import puppeteer from "@cloudflare/puppeteer";
import type { Env } from ".";

export const renderer = async (
    env: Env,
    ctx: ExecutionContext,
): Promise<Buffer> => {
    const browser = await setupBrowser(env);

    const page = await browser.newPage();

    await page.setContent(
        String.raw`
            <!DOCTYPE html>
            <html>
            <head>
                <script>
                    MathJax = {
                        startup: {
                            typeset: false
                        }
                    };
                </script>
                <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
            </head>
            </html>
        `,
    );

    const expr = String.raw`
        \left( \int_0^\infty \frac{\sin x}{\sqrt{x}} dx \right)^2 =
        \sum_{k=0}^\infty \frac{(2k)!}{2^{2k}(k!)^2} \frac{1}{2k+1} =
        \prod_{k=1}^\infty \frac{4k^2}{4k^2 - 1} = \frac{\pi}{2}
    `;

    const svg = (await page.evaluate(
        `
            (async () => {
                const container = MathJax.tex2svg(String.raw\`${expr}\`);
                const svg = container.firstChild;
                return svg.outerHTML.replace(/&nbsp;/g, '\&#A0;');
            })();
        `,
    )) as Buffer;

    browser.close();

    return svg;
};

const setupBrowser = async (env: Env): Promise<puppeteer.Browser> => {
    // @ts-ignore
    const browser = await puppeteer.launch(env.MY_BROWSER);

    return browser;
};
