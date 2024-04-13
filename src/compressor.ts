import type { Container } from ".";

export const compressor = async (container: Container): Promise<string> => {
    // encode container to base64
    const stream = new Blob([JSON.stringify(container)], {
        type: "application/json",
    }).stream();
    const compressed = stream.pipeThrough(new CompressionStream("deflate"));
    const buffer = await new Response(compressed).arrayBuffer();
    const s = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    return s;
};

export const decompressor = async (s: string): Promise<Container> => {
    const buffer = new Uint8Array(
        atob(s)
            .split("")
            .map((c) => c.charCodeAt(0)),
    );
    const stream = new Blob([buffer], {
        type: "application/json",
    }).stream();
    const decompressed = stream.pipeThrough(new DecompressionStream("deflate"));
    const resp = new Response(decompressed);
    const blob = await resp.blob();
    const container = JSON.parse(await blob.text()) as Container;

    return container;
};
type ArrayedContainer = ["0", string];

const containerToArray = (container: Container): ArrayedContainer => {
    return [container.v, JSON.stringify(container.expr)];
};

const arrayToContainer = (arr: ArrayedContainer): Container => {
    return {
        v: arr[0],
        expr: JSON.parse(arr[1]),
    };
};
