const PREFIX = "apps";

export interface App {
  id: string;
  secret: string;
  createdAt: string;
}

const generateSecret = () => {
  const size = 32;
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let key = "";
  for (let i = 0; i < size; i++) {
    key += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return key;
};

export const getApp = async (KV: KVNamespace, id: string) => {
  const app = await KV.get<App>(id, { type: "json" });
  return app;
};

export const createApp = async (KV: KVNamespace) => {
  const newApp: App = {
    id: crypto.randomUUID(),
    secret: generateSecret(),
    createdAt: new Date().toISOString(),
  };

  await KV.put(newApp.id, JSON.stringify(newApp));
  return newApp;
};
