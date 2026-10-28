declare module "@vercel/blob" {
  export function get(pathname: string, options: { access: "private"; useCache?: boolean }): Promise<{
    statusCode: number;
    stream: ReadableStream<Uint8Array> | null;
    blob: { etag: string };
  } | null>;
  export function put(
    pathname: string,
    body: Uint8Array,
    options: {
      access: "private";
      addRandomSuffix: false;
      allowOverwrite: boolean;
      ifMatch?: string;
      contentType: string;
    },
  ): Promise<{ etag: string }>;
}
