import { Link, useLoaderData } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import TypeAnimation from "react-type-animation";
import { getUserId } from "~/utils/session.server";
import PublicFacingNavbar from "~/components/public-facing-navbar";
import { Tab } from "@headlessui/react";
import { Fragment } from "react";
import clsx from "clsx";
import { CodeBlock } from "~/components/code-block";

const exampleUseCasesSequenceDelay = 2000;

const exampleUseCasesSequence = [
  "chats",
  exampleUseCasesSequenceDelay,
  "multiplayer games",
  exampleUseCasesSequenceDelay,
  "live charts",
  exampleUseCasesSequenceDelay,
  "GPS",
  exampleUseCasesSequenceDelay,
  "IoT",
  exampleUseCasesSequenceDelay,
  "notifications",
  exampleUseCasesSequenceDelay,
];

const exampleUseCases = {
  gps: {
    name: "GPS",
    image: "/gps.png",
    technologies: [
      {
        name: "Node.js & Web",
        subscribeCode: `
const drivers = await mycelium.getOrSubscribeToChannel('drivers');
drivers.on("position-changed", data => {
  map.update(data);
})
        `,
        publishCode: `
const channel = drivers.instance;
channel.publish("position-changed", { lat, long, driver: "james" });
        `,
      },
    ],
  },

  chats: {
    name: "Chats",
    technologies: [
      {
        name: "Node.js & Web",
        subscribeCode: `
// Subscribe to the room channel which is being used to send messages, 
// inform of who is typing, etc.
const room = await mycelium.getOrSubscribeToChannel("room-fitness");

// Subscribe each user to a corresponding channel based on their username. This decouples
// the concept of which users are present in the room's channel from the room's channel 
// being used to send data.
await mycelium.getOrSubscribeToChannel("room-fitness-axel");

// Get notified when a channel whose name starts with "room-fitness-" becomes
// empty or occupied. This allows us to know which users are present in the room.
const roomUsersChannels = await client.getOrListenToSituationChanges(
  'room-fitness-'
);

roomUsersChannels.on(Situation.Occupied, (occupiedChannelName) => {
  // occupiedChannelName: room-fitness-<username>
  const username = occupiedChannelName.split("-").pop();
  ui.showUserJoined(username);
});

roomUsersChannels.on(Situation.Vacant, (occupiedChannelName) => {
  // occupiedChannelName: room-fitness-<username>
  const username = occupiedChannelName.split("-").pop();
  ui.showUserLeft(username);
});

room.on("msg", msg => {
  ui.appendToConversation(msg);
});
        `,

        publishCode: `
room.instance.publish("msg", { user: "james", message: "Can anyone recommend a fitness program?" });
      `,
      },
    ],

    image: "/chat.png",
  },

  liveCharts: {
    name: "Live Charts",
    image: "",
    technologies: [
      {
        name: "Node.js & Web",
        subscribeCode: `
const euro = await mycelium.getOrSubscribeToChannel('newcoin:euro');
euro.on("rate", data => {
  chart.update(data);
});
        `,
        publishCode: `
euro.instance.publish("rate", { price, time: pricedAt });
        `,
      },
    ],
  },
};

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request);
  return json({ isLoggedIn: !!userId });
}

export default function LandingPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="relative h-full">
      <PublicFacingNavbar isLoggedIn={data.isLoggedIn} />

      <div className="px-8 max-w-6xl w-full mx-auto mt-32 flex flex-col items-center">
        <h1 className="flex flex-col justify-center items-center text-black font-black text-8xl gap-1">
          <span>Real-time</span>
          <span>Platform</span>
          <span className="text-[#DFFCFF] bg-black px-6 py-4 rounded">
            For The Edge
          </span>
        </h1>

        <div>
          <p className="text-center mt-20 text-xl text-gray-700 font-semibold">
            Build better&nbsp;
            <TypeAnimation
              wrapper="span"
              sequence={exampleUseCasesSequence}
              repeat={Infinity}
            />
          </p>
        </div>

        {data.isLoggedIn ? (
          <Link
            to="/dashboard"
            className="mt-4 text-base text-black font-extrabold bg-[#DFFCFF] py-2.5 px-6 rounded ring-2 ring-black"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            to="/sign-up"
            className="mt-4 text-base text-black font-extrabold bg-[#DFFCFF] py-2.5 px-6 rounded ring-2 ring-black"
          >
            Start free now
          </Link>
        )}
      </div>

      <div className="relative mt-52">
        <div className="overflow-hidden absolute w-full h-full inset-0">
          <div
            className="absolute top-10 w-[3500px] overflow-hidden h-[1400px] bg-gradient-to-b from-black to-[#DFFCFF] -z-20 rounded-t-full"
            style={{
              left: "calc(50% - 3500px / 2)",
            }}
          />
        </div>

        <div className="pb-8">
          <div className="max-w-7xl w-full px-8 mx-auto relative">
            <ExampleUseCasesWithCode />
          </div>
        </div>

        <div className="mt-20 max-w-7xl w-full px-8 pb-24 mx-auto text-white font-medium">
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsum animi
            dolores delectus? Facere excepturi suscipit alias nisi veniam. Quas
            necessitatibus eius exercitationem blanditiis quisquam alias
            inventore! Id cumque nesciunt nisi.
          </p>
        </div>
      </div>
    </div>
  );
}

const topTabClassName = "p-6 text-white rounded-tl rounded-tr font-medium";

function ExampleUseCasesWithCode() {
  return (
    <div className="max-w-2xl">
      <div className="rounded bg-black">
        <Tab.Group>
          <Tab.List className="bg-[#252F30] rounded-tr rounded-tl">
            {Object.keys(exampleUseCases).map((exampleUseCase) => (
              <Tab key={exampleUseCase} as={Fragment}>
                {({ selected }) => (
                  <button
                    className={clsx(topTabClassName, selected && "bg-black")}
                  >
                    {
                      exampleUseCases[
                        exampleUseCase as keyof typeof exampleUseCases
                      ].name
                    }
                  </button>
                )}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels className="text-white p-6">
            {Object.keys(exampleUseCases).map((exampleUseCase) => (
              <Tab.Panel key={exampleUseCase} className="flex flex-col gap-4">
                <Tab.Group>
                  <div className="bg-white rounded text-black">
                    <div className="flex items-center gap-20 border-b px-6 py-4 border-b-gray-300">
                      <span className="uppercase tracking-widest font-semibold">
                        Publish
                      </span>

                      <Tab.List className="ml-auto flex gap-2">
                        {exampleUseCases[
                          exampleUseCase as keyof typeof exampleUseCases
                        ].technologies.map((tech) => (
                          <Tab key={tech.name + "-publish-techs"} as={Fragment}>
                            {({ selected }) => (
                              <button
                                className={clsx(
                                  "font-semibold py-2 px-4 text-sm rounded",
                                  selected &&
                                    "bg-[#252F30] text-white ring-1 ring-black"
                                )}
                              >
                                {tech.name}
                              </button>
                            )}
                          </Tab>
                        ))}
                      </Tab.List>
                    </div>

                    <div className="px-6 py-4">
                      {exampleUseCases[
                        exampleUseCase as keyof typeof exampleUseCases
                      ].technologies.map((tech) => (
                        <Tab.Panel key={tech.name + "-publish"}>
                          <CodeBlock
                            language="typescript"
                            code={tech.publishCode}
                          />
                        </Tab.Panel>
                      ))}
                    </div>
                  </div>
                </Tab.Group>

                <Tab.Group>
                  <div className="bg-white rounded text-black">
                    <div className="flex items-center gap-20 border-b px-6 py-4 border-b-gray-300">
                      <span className="uppercase tracking-widest font-semibold">
                        Subscribe
                      </span>

                      <Tab.List className="ml-auto flex gap-2">
                        {exampleUseCases[
                          exampleUseCase as keyof typeof exampleUseCases
                        ].technologies.map((tech) => (
                          <Tab
                            key={tech.name + "-subscribe-techs"}
                            as={Fragment}
                          >
                            {({ selected }) => (
                              <button
                                className={clsx(
                                  "font-semibold py-2 px-4 text-sm rounded",
                                  selected &&
                                    "bg-[#252F30] text-white ring-1 ring-black"
                                )}
                              >
                                {tech.name}
                              </button>
                            )}
                          </Tab>
                        ))}
                      </Tab.List>
                    </div>

                    <div className="px-6 py-4">
                      {exampleUseCases[
                        exampleUseCase as keyof typeof exampleUseCases
                      ].technologies.map((tech) => (
                        <Tab.Panel key={tech.name + "-subscribe"}>
                          <CodeBlock
                            language="typescript"
                            code={tech.subscribeCode}
                          />
                        </Tab.Panel>
                      ))}
                    </div>
                  </div>
                </Tab.Group>

                {exampleUseCases[exampleUseCase as keyof typeof exampleUseCases]
                  .image ? (
                  <img
                    className="absolute -z-10 -top-28 right-8 max-w-full w-[660px] rounded ring-2 ring-black"
                    src={
                      exampleUseCases[
                        exampleUseCase as keyof typeof exampleUseCases
                      ].image
                    }
                    alt=""
                  />
                ) : null}
              </Tab.Panel>
            ))}

            <Tab.Panel>Content 2</Tab.Panel>

            <Tab.Panel>Content 3</Tab.Panel>

            <Tab.Panel>Content 4</Tab.Panel>

            <Tab.Panel>Content 5</Tab.Panel>

            <Tab.Panel>Content 6</Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}
