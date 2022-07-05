import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  MyceliumProvider,
  useLazyChannel,
  AuthenticationType,
  useSituationChangeListener,
  useOnSituationChange,
  Situation,
  usePublishEvent,
  Channel,
  useChannel,
  useOnEvent,
} from "@mycelium-now/react";

// These credentials are sensitive and this authentication type is not recommended for production use
// but for the simplicity of this demo, we will be using it. Use token authentication instead for
// production.
const MYCELIUM_API_KEY_ID = "6O9oI7QsbFa77KveRRO2J";
const MYCELIUM_API_KEY_SECRET = "ycbUDnCXAo5nKJfbh2-jPdxYG1LxNbYx";
const MYCELIUM_KEY = `${MYCELIUM_API_KEY_ID}:${MYCELIUM_API_KEY_SECRET}`;

const MYCELIUM_WS_BASE_URL = "ws://[::1]:9001/realtime";
const MYCELIUM_HTTP_BASE_URL = "http://[::1]:9001";
const CHAT_ROOM_NAME = "mycelium-room";

const App = () => {
  return (
    <MyceliumProvider
      baseURL={MYCELIUM_WS_BASE_URL}
      authentication={{
        type: AuthenticationType.KEY,
        getKey() {
          return MYCELIUM_KEY;
        },
      }}
    >
      <Index />
    </MyceliumProvider>
  );
};

type JoiningRoomStatus = "idle" | "joining" | "joined" | "error";

interface RoomProps {
  room: {
    joinStatus: JoiningRoomStatus;
    users: string[];
  };

  setRoom: React.Dispatch<
    React.SetStateAction<{
      joinStatus: JoiningRoomStatus;
      users: string[];
    }>
  >;

  username: string;
}

const Room = ({ room, setRoom, username }: RoomProps) => {
  // Listen to situation changes on channels that start with the prefix:
  // `CHAT_ROOM_NAME-`
  // This allows us to know when a user joins or leaves this room.
  const { situationChangesListener } = useSituationChangeListener(
    `${CHAT_ROOM_NAME}-`
  );

  const { channel } = useChannel(CHAT_ROOM_NAME);
  const { publish } = usePublishEvent(channel);
  const [contents, setContents] = React.useState("");
  const [messages, setMessages] = React.useState<
    {
      byUser: string;
      contents: string;
    }[]
  >([]);

  // Whenever a user leaves.
  useOnSituationChange(
    situationChangesListener,
    Situation.Vacant,
    (channelName) => {
      const userWhoLeft = channelName.substring(CHAT_ROOM_NAME.length + 1);
      setRoom((r) => ({
        ...r,
        users: r.users.filter((user) => user !== userWhoLeft),
      }));
    }
  );

  // Whenever a user joins.
  useOnSituationChange(
    situationChangesListener,
    Situation.Occupied,
    (channelName) => {
      const userWhoJoined = channelName.substring(CHAT_ROOM_NAME.length + 1);
      setRoom((r) => ({
        ...r,
        users: [...r.users, userWhoJoined],
      }));
    }
  );

  // Update local messages state whenever we get a new-message.
  useOnEvent<typeof messages[number]>(channel, "new-message", (message) => {
    setMessages((m) => [
      ...m,
      {
        byUser: message.byUser,
        contents: message.contents,
      },
    ]);
  });

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "white",
        height: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          height: "100%",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <p
            style={{
              borderBottom: "1px solid black",
              padding: "24px",
              fontWeight: "bold",
            }}
          >
            MESSAGES
          </p>

          <ul
            style={{
              padding: "24px",
              listStyleType: "none",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              flex: 1,
              overflowY: "auto",
            }}
          >
            {messages.map((message, index) => (
              <li
                key={`${index}-${message.byUser}`}
                style={{ display: "flex", flexDirection: "column" }}
              >
                <span style={{ fontWeight: "bold" }}>{message.byUser}</span>
                <span style={{ marginTop: "2px" }}>{message.contents}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            maxWidth: "200px",
            width: "100%",
            padding: "24px",
            borderLeft: "1px solid black",
          }}
        >
          <ul style={{ listStyleType: "none" }}>
            {room.users.map((user) => (
              <li key={user}>{user}</li>
            ))}
          </ul>
        </div>
      </div>

      <form
        style={{
          padding: "24px",
          backgroundColor: "white",
          borderTop: "1px solid black",
        }}
        onSubmit={(e) => {
          e.preventDefault();

          publish(
            "new-message",
            {
              byUser: username,
              contents,
            },
            true
          );
        }}
      >
        <textarea
          style={{ width: "100%", padding: "10px" }}
          name="message"
          id="message"
          rows={5}
          value={contents}
          onChange={(e) => setContents(e.target.value)}
        />
        <button
          style={{ marginTop: "12px", padding: "6px 12px", width: "100%" }}
        >
          Send message
        </button>
      </form>
    </div>
  );
};

const Index = () => {
  const [username, setUsername] = React.useState("");
  const { subscribe, channel } = useLazyChannel();
  const [room, setRoom] = React.useState({
    joinStatus: "idle" as JoiningRoomStatus,
    users: [] as string[],
  });

  const joinRoom = async () => {
    if (!username) {
      return;
    }

    setRoom({
      joinStatus: "joining",
      users: [],
    });

    try {
      // Subscribe each user to a corresponding channel based on their username. This decouples
      // the concept of which users are present in the channel from the channel that is actually
      // being used to send data.
      // Also subscribe each user to the room being used to send data.
      await Promise.all([
        subscribe(`${CHAT_ROOM_NAME}-${username}`),
        subscribe(CHAT_ROOM_NAME),
      ]);

      // Fetch the channels with the prefix <CHAT_ROOM_NAME>-
      // This will give us something like:
      // ["CHAT_ROOM_NAME-user-1", "CHAT_ROOM_NAME-user-2"]
      /// From this we know what users have joined the chat room.
      const data: { channels: string[] } = await fetch(
        `${MYCELIUM_HTTP_BASE_URL}/channels?key=${MYCELIUM_KEY}&filter_by_prefix=${CHAT_ROOM_NAME}-`
      ).then((r) => r.json());

      setRoom({
        joinStatus: "joined",
        users: data.channels.map((channel) => {
          // Return just the username by removing the CHAT_ROOM_NAME- prefix.
          return channel.substring(CHAT_ROOM_NAME.length + 1);
        }),
      });
    } catch (error) {
      setRoom({
        joinStatus: "error",
        users: [],
      });
    }
  };

  if (room.joinStatus === "joined") {
    return <Room room={room} setRoom={setRoom} username={username} />;
  }

  return (
    <div
      style={{
        padding: "24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        style={{
          display: "flex",
          flexDirection: "column",
          textAlign: "center",
        }}
        onSubmit={(e) => {
          e.preventDefault();
          joinRoom();
        }}
      >
        <label
          htmlFor="username"
          style={{ display: "block", marginBottom: "12px", fontSize: 18 }}
        >
          Choose your username
        </label>
        <input
          type="text"
          name="username"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: "6px 12px" }}
        />
        <button
          type="submit"
          style={{ marginTop: "12px", padding: "6px 12px" }}
        >
          Join Room
        </button>
      </form>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
