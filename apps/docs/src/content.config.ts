import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const routeIds = new Map([
  ["docs/index.md", "index"],
  ["docs/getting-started.md", "getting-started"],
  ["docs/installation.md", "install/index"],
  ["docs/HOME_ASSISTANT.md", "install/home-assistant"],
  ["docs/NAVET_DEV.md", "install/navet-dev"],
  ["docs/HOMEY.md", "install/homey"],
  ["docs/OPENHAB.md", "install/openhab"],
  ["docs/user-guide.md", "guide/index"],
  ["docs/WIDGETS.md", "guide/widgets"],
  ["docs/integrations.md", "integrations"],
  ["docs/help.md", "help"],
  ["docs/ROADMAP.md", "roadmap"],
  ["docs/resources.mdx", "resources"],
  ["docs/changelog.mdx", "changelog"],
  ["docs/developers.md", "developers/index"],
  ["CONTRIBUTING.md", "developers/contributing"],
  ["SECURITY.md", "security"],
]);

const docs = defineCollection({
  loader: glob({
    base: "../..",
    pattern: [...routeIds.keys()],
    generateId: ({ entry }) => routeIds.get(entry) ?? entry,
  }),
  schema: docsSchema(),
});

export const collections = { docs };
