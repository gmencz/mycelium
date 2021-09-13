import { boolean, object } from "zod";
import { MyceliumCloseCode, MyceliumCloseMessage } from "~/api/protocol";
import { Client } from "~/bucket";
import { MessageMessage } from "../message-message";
import { Json, jsonSchema } from "../parse";

const schema = object({
  includePublisher: boolean().optional(),
  message: jsonSchema
});

const handlePublishMessage = (
  d: Json | undefined,
  client: Client,
  clients: Client[]
) => {
  let payload;
  try {
    payload = schema.parse(d);
  } catch (error) {
    return client.webSocket.close(
      MyceliumCloseCode.InvalidPayload,
      MyceliumCloseMessage.InvalidPayload
    );
  }

  const { includePublisher, message } = payload;
  const jsonMessage = new MessageMessage(message).toJSON();

  if (includePublisher) {
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      client.webSocket.send(jsonMessage);
    }

    return;
  }

  for (let i = 0; i < clients.length; i++) {
    const currentClient = clients[i];
    if (currentClient.id !== client.id) {
      client.webSocket.send(jsonMessage);
    }
  }
};

export { handlePublishMessage };
