import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  MyceliumProvider,
  useMyceliumClient,
  useSubscribe,
  AuthenticationType,
} from "@mycelium-now/react";

const App = () => {
  return (
    <MyceliumProvider
      baseURL="ws://[::1]:9001/realtime"
      authentication={{
        type: AuthenticationType.KEY,
        getKey() {
          return "6O9oI7QsbFa77KveRRO2J:ycbUDnCXAo5nKJfbh2-jPdxYG1LxNbYx";
        },
      }}
    >
      <div style={{ padding: "24px" }}>
        <SubscribeToChannelInput />
      </div>
    </MyceliumProvider>
  );
};

const SubscribeToChannelInput = () => {
  const [channelName, setChannelName] = React.useState<string>("");
  const { subscribe } = useSubscribe();
  const { isConnecting, client } = useMyceliumClient();
  const channels = client?.getChannels() || [];

  if (isConnecting) {
    return <p>Connecting to Mycelium...</p>;
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!channelName) {
            return;
          }

          subscribe(channelName);
        }}
      >
        <label
          htmlFor="channel"
          style={{ display: "block", marginBottom: "10px" }}
        >
          Channel
        </label>
        <input
          type="text"
          name="channel"
          id="channel"
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
        />
        <button type="submit">Subscribe</button>
      </form>

      {channels.length ? (
        <ul style={{ marginTop: "16px" }}>
          {channels.map((channel) => (
            <li key={channel}>{channel}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
