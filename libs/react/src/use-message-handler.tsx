import { Handler } from '@mycelium/web';
import { useEffect } from 'react';
import { useMycelium } from './use-mycelium';

interface MessageHandler {
  channel: string;
  handlerName: string;
  handler: Handler<unknown>;
}

function useMessagesHandlers(handlers: MessageHandler[]) {
  const { connection } = useMycelium();

  useEffect(() => {
    if (!connection) {
      return;
    }

    handlers.forEach((handler) => {
      connection.addMessageHandler(
        handler.channel,
        handler.handlerName,
        handler.handler
      );
    });

    return () => {
      handlers.forEach((handler) => {
        connection.removeMessageHandler(handler.channel, handler.handlerName);
      });
    };
  }, [connection, handlers]);
}

export { useMessagesHandlers };
