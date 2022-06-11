import uWS, { App } from "uWebSockets.js";
import { connect, JSONCodec } from "nats";
import { generate } from "shortid";

const NATS_HOST = process.env.NATS_HOST;
if (!NATS_HOST) {
  throw new Error("NATS_HOST is missing");
}

const PORT = process.env.PORT;
if (!PORT) {
  throw new Error("PORT is missing");
}

function broadcast(
  webSockets: uWS.WebSocket[],
  message: string,
  wsId?: string
) {
  if (wsId) {
    webSockets.forEach((ws) => {
      if (ws.id !== wsId) {
        ws.send(message);
      }
    });

    return;
  }

  webSockets.forEach((ws) => {
    ws.send(message);
  });
}

async function main() {
  // create a connection to a nats-server
  const nc = await connect({ servers: NATS_HOST });
  console.log(`connected to NATS at ${nc.getServer()}`);

  // create a codec
  const sc = JSONCodec();

  // store this server's clients and their channels
  const wsChannels = new Map<uWS.WebSocket, Set<string>>();
  const channelsWs = new Map<string, uWS.WebSocket[]>();

  // create a simple subscriber and iterate over messages
  // matching the subscription
  const sub = nc.subscribe("msg");
  (async () => {
    for await (const m of sub) {
      const data: any = sc.decode(m.data);

      switch (data.type) {
        case "subscriber-added": {
          const webSockets = channelsWs.get(data.channel);
          if (webSockets) {
            broadcast(
              webSockets,
              JSON.stringify({
                type: "subscriber-added",
                channel: data.channel,
              }),
              data.wsId
            );
          }

          break;
        }

        case "subscriber-removed": {
          const webSockets = channelsWs.get(data.channel);
          if (webSockets) {
            broadcast(
              webSockets,
              JSON.stringify({
                type: "subscriber-removed",
                channel: data.channel,
              }),
              data.wsId
            );
          }

          break;
        }
      }
    }
  })();

  App()
    .ws("/", {
      /* Options */
      compression: uWS.SHARED_COMPRESSOR,
      maxPayloadLength: 16 * 1024 * 1024,
      idleTimeout: 120,
      /* Handlers */
      open: (ws) => {
        ws.id = generate();
      },
      message: (ws, message) => {
        const data = JSON.parse(Buffer.from(message).toString());

        switch (data.type) {
          case "subscribe": {
            const isSubscribed = wsChannels.get(ws)?.has(data.channel);
            if (isSubscribed) {
              return;
            }

            if (wsChannels.has(ws)) {
              wsChannels.get(ws)!.add(data.channel);
            } else {
              wsChannels.set(ws, new Set([data.channel]));
            }

            if (channelsWs.has(data.channel)) {
              channelsWs.get(data.channel)!.push(ws);
            } else {
              channelsWs.set(data.channel, [ws]);
            }

            // Notify other subscribers of this subscription.
            nc.publish(
              "msg",
              sc.encode({
                type: "subscriber-added",
                channel: data.channel,
                wsId: ws.id,
              })
            );

            return;
          }

          case "unsubscribe": {
            const isSubscribed = wsChannels.get(ws)?.has(data.channel);
            if (!isSubscribed) {
              return;
            }

            wsChannels.get(ws)?.delete(data.channel);

            channelsWs.set(
              data.channel,
              (channelsWs.get(data.channel) || []).filter(
                ({ id }) => id !== ws.id
              )
            );

            // Notify other subscribers of this unsubscription.
            nc.publish(
              "msg",
              sc.encode({
                type: "subscriber-removed",
                channel: data.channel,
                wsId: ws.id,
              })
            );

            return;
          }
        }
      },
    })
    .listen(Number(PORT), (token) => {
      if (token) {
        console.log("mycelium listening to port " + PORT);
      } else {
        console.log("mycelium failed to listen to port " + PORT);
      }
    });
}

main();
