import waitForExpect from 'wait-for-expect';
import { WebSocket } from 'ws';
import { Client } from './client';
import { AuthenticationType, Situation } from './types';

// @ts-expect-error because we're assigning a library's WebSocket type to the built-in WebSocket type
// and they're incompatible.
global.WebSocket = WebSocket;

const client = new Client({
  baseURL: 'ws://[::1]:9001/realtime',
  authentication: {
    type: AuthenticationType.KEY,
    getKey() {
      return '6O9oI7QsbFa77KveRRO2J:ycbUDnCXAo5nKJfbh2-jPdxYG1LxNbYx';
    },
  },
});

beforeAll(async () => {
  await waitForExpect(() => {
    expect(client.isConnected).toBe(true);
  });
});

afterAll(() => {
  client.disconnect();
});

test('pub/sub', async () => {
  const channelName = 'test-channel';
  const channel = await client.getOrSubscribeToChannel(channelName);

  let handlerData: unknown;
  channel.on<string>('hello-world', (data) => {
    handlerData = data;
  });

  await channel.instance.publish('hello-world', 'Hello, World!', true);

  await waitForExpect(() => {
    expect(handlerData).not.toBeUndefined();
  });

  expect(handlerData).toMatchInlineSnapshot(`"Hello, World!"`);

  await channel.instance.unsubscribe();
});

test('channels situations', async () => {
  const channelName = 'test-channel-1';
  const situationChanges = await client.getOrListenToSituationChanges(
    'test-channel-'
  );

  let occupiedChannel: unknown;
  situationChanges.on(Situation.Occupied, (occupiedChannelName) => {
    occupiedChannel = occupiedChannelName;
  });

  const channel = await client.getOrSubscribeToChannel(channelName);

  await waitForExpect(() => {
    expect(occupiedChannel).not.toBeUndefined();
  });

  expect(occupiedChannel).toMatchInlineSnapshot(`"test-channel-1"`);

  await client.unlistenToSituationChanges('test-channel-');
  await channel.instance.unsubscribe();
});
