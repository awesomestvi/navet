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
  ["docs/branding/README.md", "brand/index"],
  ["docs/branding/BRAND_FOUNDATIONS.md", "brand/foundations"],
  ["docs/branding/VOICE_AND_MESSAGING.md", "brand/voice"],
  ["docs/branding/VISUAL_IDENTITY.md", "brand/visual"],
  ["docs/branding/CARD_GRAMMAR.md", "brand/cards"],
  ["docs/branding/ASSET_SYSTEM.md", "brand/assets"],
  ["docs/branding/GOVERNANCE.md", "brand/governance"],
  ["docs/branding/TRADEMARK_POLICY.md", "brand/trademark"],
  ["docs/developers.md", "developers/index"],
  ["CONTRIBUTING.md", "developers/contributing"],
  ["CODE_OF_CONDUCT.md", "developers/code-of-conduct"],
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
