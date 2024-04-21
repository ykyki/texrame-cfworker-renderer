import type { Buffer } from "node:buffer";
import puppeteer from "@cloudflare/puppeteer";

import TEX_SVG_SOURCE from "../vendor/tex-svg.txt";

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
                <script>${TEX_SVG_SOURCE}</script>
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

const SETUP_BROWSER_RETRY_MAX_COUNT = 20;
const SETUP_BROWSER_RETRY_MIN_INTERVAL = 300; // milliseconds
const setupBrowser = async (env: Env): Promise<puppeteer.Browser> => {
    for (let i = 0; i < SETUP_BROWSER_RETRY_MAX_COUNT; i++) {
        try {
            return await setupBrowserOnce(env);
        } catch (e) {
            console.error(e);
        }

        await new Promise((resolve) =>
            setTimeout(
                resolve,
                SETUP_BROWSER_RETRY_MIN_INTERVAL +
                    Math.random() * 3 * SETUP_BROWSER_RETRY_MIN_INTERVAL,
            ),
        );
        console.log(`Retrying to setup browser... ${i}`); // TODO remove
        // continue
    }

    throw new Error("Failed to setup the browser");
};

const setupBrowserOnce = async (env: Env): Promise<puppeteer.Browser> => {
    // @ts-ignore
    const sessionId = await retrieveSession(env.MY_BROWSER);

    if (sessionId === undefined) {
        // @ts-ignore
        const browser = await puppeteer.launch(env.MY_BROWSER);
        return browser;
    }

    if (sessionId === null) {
        throw new Error("Failed to retrieve a session");
    }

    try {
        // @ts-ignore
        const browser = await puppeteer.connect(env.MY_BROWSER, sessionId);
        return browser;
    } catch (e) {
        console.error(e);
        throw new Error(
            `Failed to connect to the browser. (session = ${sessionId})`,
        );
    }
};

const teardownBrowser = async (browser: puppeteer.Browser): Promise<void> => {
    browser.disconnect();
};

const retrieveSession = async (
    endpoint: puppeteer.BrowserWorker,
): Promise<string | null | undefined> => {
    const sessions: puppeteer.ActiveSession[] =
        await puppeteer.sessions(endpoint);

    if (sessions.length === 0) {
        return undefined;
    }

    const sessionIds = sessions
        .filter((v) => {
            return v.connectionId === undefined; // remove sessions with workers connected to them
        })
        .map((v) => {
            return v.sessionId;
        });

    if (sessionIds.length === 0) {
        return null;
    }

    // pick a random session
    const sessionId = sessionIds[Math.floor(Math.random() * sessionIds.length)];

    return sessionId;
};
