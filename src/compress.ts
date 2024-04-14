import { Buffer } from "node:buffer";
import type { Container } from ".";

export const simpleHash = (s: string): Buffer => {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }

    const buffer = Buffer.alloc(4);
    buffer.writeInt32LE(hash, 0);

    return buffer;
};

const FORMAT = "deflate";

export const compressor = async (c: Container): Promise<string> => {
    const stream = new Blob([JSON.stringify(compressContainer(c))], {
        type: "application/json",
    }).stream();

    const compressed = stream.pipeThrough(new CompressionStream(FORMAT));

    const buf = await new Response(compressed).arrayBuffer();

    const s = btoa(String.fromCharCode(...new Uint8Array(buf)));

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

    const decompressed = stream.pipeThrough(new DecompressionStream(FORMAT));

    const blob = await new Response(decompressed).blob();

    const container = JSON.parse(await blob.text()) as CompressedContainer; // TODO validate

    return decompressContainer(container);
};

type CompressedContainer = [string];

const compressContainer = (container: Container): CompressedContainer => {
    return [container.expr];
};

const decompressContainer = (compressed: CompressedContainer): Container => {
    return {
        expr: compressed[0],
    };
};
