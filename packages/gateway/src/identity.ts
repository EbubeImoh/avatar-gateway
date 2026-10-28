import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as cryptoSign,
  verify as cryptoVerify,
  type KeyObject,
} from "node:crypto";

export interface Ed25519Identity {
  /** PKCS#8 PEM. Keep this on the owning backend; never send it to a browser. */
  privateKeyPem: string;
  /** SPKI PEM. Safe to publish in the identity registry. */
  publicKeyPem: string;
  did: string;
}

export function generateIdentity(): Ed25519Identity {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privateKeyPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  const publicKeyPem = publicKey.export({ format: "pem", type: "spki" }).toString();
  return { privateKeyPem, publicKeyPem, did: didKeyFromPublicKey(publicKey) };
}

export function identityFromPrivateKeyPem(privateKeyPem: string): Ed25519Identity {
  const privateKey = createPrivateKey(privateKeyPem);
  if (privateKey.asymmetricKeyType !== "ed25519") throw new TypeError("Expected an Ed25519 private key");
  const publicKey = createPublicKey(privateKey);
  const publicKeyPem = publicKey.export({ format: "pem", type: "spki" }).toString();
  return { privateKeyPem, publicKeyPem, did: didKeyFromPublicKey(publicKey) };
}

/** Build a did:key for an Ed25519 SPKI key using the multicodec/multibase form. */
export function didKeyFromPublicKey(publicKey: string | Buffer | KeyObject): string {
  const key = typeof publicKey === "string" || Buffer.isBuffer(publicKey)
    ? createPublicKey(publicKey)
    : publicKey;
  if (key.asymmetricKeyType !== "ed25519") throw new TypeError("Expected an Ed25519 public key");
  const der = key.export({ format: "der", type: "spki" });
  const raw = der.subarray(der.length - 32);
  if (raw.length !== 32) throw new TypeError("Invalid Ed25519 public key length");
  return `did:key:${base58btc(Buffer.concat([Buffer.from([0xed, 0x01]), raw]))}`;
}

export function signPayload(payload: string | Uint8Array, privateKeyPem: string): string {
  return cryptoSign(null, Buffer.from(payload), createPrivateKey(privateKeyPem)).toString("base64url");
}

export function verifyPayload(payload: string | Uint8Array, signature: string, publicKeyPem: string): boolean {
  try {
    return cryptoVerify(null, Buffer.from(payload), createPublicKey(publicKeyPem), Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
}

function base58btc(input: Buffer): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let value = BigInt(`0x${input.toString("hex")}`);
  let encoded = "";
  while (value > 0n) {
    encoded = alphabet[Number(value % 58n)] + encoded;
    value /= 58n;
  }
  for (const byte of input) {
    if (byte !== 0) break;
    encoded = `1${encoded}`;
  }
  return `z${encoded}`;
}
