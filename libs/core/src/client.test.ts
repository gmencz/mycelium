import waitForExpect from 'wait-for-expect';
import { WebSocket } from 'ws';
import { AuthenticationType, Client } from './client';
import { Situation } from './message';

// @ts-expect-error
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

test('subscribe, publish, unsubscribe', async () => {
  const channelName = 'test-channel';
  const channel = await client.getOrSubscribeToChannel(channelName);

  let handlerData: unknown;
  channel.on('hello-world', (data) => {
    handlerData = data;
  });

  await channel.publish('hello-world', 'Hello, World!', true);

  await waitForExpect(() => {
    expect(handlerData).not.toBeUndefined();
  });

  expect(handlerData).toMatchInlineSnapshot(`"Hello, World!"`);

  await channel.unsubscribe();
});

test('situation_listen', async () => {
  const channelName = 'test-channel-1';
  const { on } = await client.getOrListenToSituationChanges('test-channel-');

  let occupiedChannel: unknown;
  on(Situation.Occupied, (occupiedChannelName) => {
    occupiedChannel = occupiedChannelName;
  });

  const channel = await client.getOrSubscribeToChannel(channelName);

  await waitForExpect(() => {
    expect(occupiedChannel).not.toBeUndefined();
  });

  expect(occupiedChannel).toMatchInlineSnapshot(`"test-channel-1"`);

  await client.unlistenToSituationChanges('test-channel-');
  await channel.unsubscribe();
});
