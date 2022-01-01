function hexStringToArrayBuffer(str: string) {
  const hexString = str.replace(/^0x/, "");

  if (hexString.length % 2 != 0) {
    return;
  }

  if (hexString.match(/[G-Z\s]/i)) {
    return;
  }

  const pairs = hexString.match(/[\dA-F]{2}/gi);
  if (!pairs) {
    return;
  }

  return new Uint8Array(pairs.map(s => parseInt(s, 16))).buffer;
}

export async function verifySignature(
  stringToSign: string,
  signature: string,
  signingKey: string
) {
  const encoder = new TextEncoder();
  const signatureBuffer = hexStringToArrayBuffer(signature);

  if (!signatureBuffer) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const verified = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBuffer,
    encoder.encode(stringToSign)
  );

  return verified;
}
