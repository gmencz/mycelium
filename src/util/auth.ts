export function parseAuthorizationHeader(header: string | undefined) {
  if (!header) {
    throw new Error("Missing authorization header");
  }

  if (header.startsWith("Bearer ")) {
    const token = header.substring(7, header.length);
    return token;
  } else {
    throw new Error("Invalid authorization header");
  }
}
