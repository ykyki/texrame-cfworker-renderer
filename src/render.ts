import type { Buffer } from "node:buffer";
import puppeteer from "@cloudflare/puppeteer";
import type { Env } from ".";

export const renderer = async (
    expr: string,
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

    const svg = (await page.evaluate(async (expr) => {
        // @ts-ignore
        const container = MathJax.tex2svg(String.raw`${expr}`);
        const svg = container.firstChild;
        return svg.outerHTML.replace(/&nbsp;/g, "&#A0;");
    }, expr)) as Buffer;

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
