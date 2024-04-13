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

    const expr =
        String.raw`
        \left( \int_0^\infty \frac{\sin x}{\sqrt{x}} dx \right)^2 =
        \sum_{k=0}^\infty \frac{(2k)!}{2^{2k}(k!)^2} \frac{1}{2k+1} =
        \prod_{k=1}^\infty \frac{4k^2}{4k^2 - 1} = \frac{\pi}{2}
        \text{オイラー}
    ` + new Date().getTime();

    const svg = (await page.evaluate(
        `
            (async () => {
                const container = MathJax.tex2svg(String.raw\`${expr}\`);
                const svg = container.firstChild;
                return svg.outerHTML.replace(/&nbsp;/g, '\&#A0;');
            })();
        `,
    )) as Buffer;

    teardownBrowser(browser);

    return svg;
};

const setupBrowser = async (env: Env): Promise<puppeteer.Browser> => {
    // @ts-ignore
    const sessionId = await retrieveSession(env.MY_BROWSER);

    if (sessionId !== null) {
        try {
            // @ts-ignore
            const browser = await puppeteer.connect(env.MY_BROWSER, sessionId);
            return browser;
        } catch (e) {
            throw new Error("Failed to connect to the browser");
        }
    }

    // @ts-ignore
    const browser = await puppeteer.launch(env.MY_BROWSER);
    return browser;
};

const teardownBrowser = async (browser: puppeteer.Browser): Promise<void> => {
    browser.disconnect();
};

const retrieveSession = async (
    endpoint: puppeteer.BrowserWorker,
): Promise<string | null> => {
    const sessions: puppeteer.ActiveSession[] =
        await puppeteer.sessions(endpoint);

    const sessionsIds = sessions
        .filter((v) => {
            return v.connectionId === undefined; // remove sessions with workers connected to them
        })
        .map((v) => {
            return v.sessionId;
        });

    if (sessionsIds.length === 0) {
        return null;
    }

    // pick a random session
    const sessionId =
        sessionsIds[Math.floor(Math.random() * sessionsIds.length)];

    return sessionId;
};
