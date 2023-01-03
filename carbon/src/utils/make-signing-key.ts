export function makeSigningKey() {
  const size = 32;
  let key = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const charactersLength = characters.length;
  for (let i = 0; i < size; i++) {
    key += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return key;
}
