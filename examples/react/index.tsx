import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  MyceliumProvider,
  useMyceliumClient,
  useSubscribe,
  AuthenticationType,
} from "@mycelium-now/react";

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
      <div style={{ padding: "24px" }}>
        <ChatRoom />
      </div>
    </MyceliumProvider>
  );
};

type JoiningRoomStatus = "idle" | "joining" | "joined" | "error";

const ChatRoom = () => {
  const [username, setUsername] = React.useState("");
  const { subscribe, isLoading } = useSubscribe();
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
          // Return just the username and remove the CHAT_ROOM_NAME- prefix.
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
    return (
      <div>
        <p>Users</p>
        <ul>
          {room.users.map((user) => (
            <li key={user}>{user}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          joinRoom();
        }}
      >
        <label
          htmlFor="username"
          style={{ display: "block", marginBottom: "10px" }}
        >
          Username
        </label>
        <input
          type="text"
          name="username"
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button type="submit">Join Room</button>
      </form>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
