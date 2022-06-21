import { build, teardown } from "./server";
import { beforeShutdown } from "./util/before-shutdown";
import { setupEnv } from "./util/env";

const { PORT } = setupEnv();

async function start(port: number) {
  try {
    const { server, nc, webSocketsChannels, channelsWebSockets } = await build({
      logger: {
        level: "info",
        transport: {
          target: "pino-pretty",
        },
      },
    });

    beforeShutdown(
      {
        log: {
          error: (data) => server.log.error(data),
          info: (data) => server.log.info(data),
        },
      },
      async () => {
        await teardown({ server, nc, webSocketsChannels, channelsWebSockets });
      }
    );

    await server.listen({
      port,
      host: process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost",
    });
  } catch (err) {
    console.error(`Server failed to start on port ${port}, error: ${err}`);
    process.exit(1);
  }
}

start(Number(PORT));
