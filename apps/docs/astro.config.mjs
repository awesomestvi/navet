import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://docs.navet.app",
  publicDir: "../../assets/public",
  integrations: [
    starlight({
      title: "Navet",
      description: "Install, configure, and get the most out of Navet.",
      favicon: "/favicon.svg",
      head: [
        {
          tag: "script",
          content:
            "try{if(!localStorage.getItem('starlight-theme')){localStorage.setItem('starlight-theme','dark');document.documentElement.dataset.theme='dark'}}catch{}",
        },
      ],
      logo: {
        src: "../../assets/public/logo.svg",
        alt: "",
      },
      components: {
        Header: "./src/components/NavetHeader.astro",
        MobileTableOfContents: "./src/components/NavetMobileTableOfContents.astro",
        PageTitle: "./src/components/NavetPageTitle.astro",
        TableOfContents: "./src/components/NavetTableOfContents.astro",
      },
      customCss: ["./src/styles/navet.css"],
      social: [
        {
          icon: "github",
          label: "Navet on GitHub",
          href: "https://github.com/awesomestvi/navet",
        },
      ],
      lastUpdated: true,
      sidebar: [
        { label: "Overview", link: "/" },
        { label: "Getting started", link: "/getting-started/" },
        {
          label: "Installation",
          items: [
            { label: "Choose an installation", link: "/install/" },
            { label: "Home Assistant", link: "/install/home-assistant/" },
            { label: "Navet Dev", link: "/install/navet-dev/" },
            { label: "Homey", link: "/install/homey/" },
            { label: "openHAB", link: "/install/openhab/" },
          ],
        },
        {
          label: "User guide",
          items: [
            { label: "Using Navet", link: "/guide/" },
            { label: "Widgets", link: "/guide/widgets/" },
          ],
        },
        {
          label: "How-to guides",
          items: [
            { label: "All how-to guides", link: "/guide/how-to/" },
            {
              label: "Quick start",
              items: [
                { label: "Quick start overview", link: "/guide/quick-start/" },
                { label: "Your first 15 minutes", link: "/guide/quick-start/first-15-minutes/" },
                { label: "Phone and tablet", link: "/guide/quick-start/phone-and-tablet/" },
                { label: "Install the PWA", link: "/guide/quick-start/install-pwa/" },
              ],
            },
            {
              label: "Dashboards",
              items: [
                { label: "Dashboard guides", link: "/guide/dashboards/" },
                {
                  label: "Create a second dashboard",
                  link: "/guide/dashboards/create-second-dashboard/",
                },
                { label: "Switch and manage", link: "/guide/dashboards/switch-and-manage/" },
                { label: "Assign to a device", link: "/guide/dashboards/assign-to-device/" },
                { label: "Customize Home", link: "/guide/dashboards/customize-home/" },
                { label: "Add cards and widgets", link: "/guide/dashboards/add-cards/" },
                { label: "Layout packs", link: "/guide/dashboards/layout-packs/" },
                {
                  label: "Sync across devices",
                  link: "/guide/dashboards/sync-across-devices/",
                },
                { label: "Back up and restore", link: "/guide/dashboards/backup-and-restore/" },
                { label: "Restore entities", link: "/guide/dashboards/restore-entities/" },
                { label: "Resolve sync conflicts", link: "/guide/dashboards/sync-conflicts/" },
              ],
            },
            {
              label: "Rooms",
              items: [
                { label: "Room guides", link: "/guide/rooms/" },
                { label: "Organize rooms", link: "/guide/rooms/organize-rooms/" },
                { label: "Manage devices", link: "/guide/rooms/manage-devices/" },
                {
                  label: "Advanced room management",
                  link: "/guide/rooms/advanced-room-management/",
                },
                { label: "Room appearance", link: "/guide/rooms/room-appearance/" },
              ],
            },
            {
              label: "Wall displays",
              items: [
                { label: "Wall display guides", link: "/guide/wall-displays/" },
                { label: "Kiosk and Wall Display", link: "/guide/wall-displays/kiosk-mode/" },
                { label: "Low-power displays", link: "/guide/wall-displays/low-power/" },
                { label: "Kiosk recovery", link: "/guide/wall-displays/recovery/" },
              ],
            },
            {
              label: "Everyday control",
              items: [
                { label: "Everyday control guides", link: "/guide/everyday-control/" },
                { label: "Notifications", link: "/guide/everyday-control/notifications/" },
                { label: "Lights and scenes", link: "/guide/everyday-control/lights-and-scenes/" },
                { label: "Climate", link: "/guide/everyday-control/climate/" },
                { label: "Media", link: "/guide/everyday-control/media/" },
                { label: "Security", link: "/guide/everyday-control/security/" },
                { label: "Energy", link: "/guide/everyday-control/energy/" },
                {
                  label: "Household chores",
                  link: "/guide/everyday-control/household-chores/",
                },
                {
                  label: "Automations and scripts",
                  link: "/guide/everyday-control/automations-and-scripts/",
                },
                {
                  label: "Notes, photos, and RSS",
                  link: "/guide/everyday-control/notes-photos-rss/",
                },
                {
                  label: "Actions, maps, and status",
                  link: "/guide/everyday-control/actions-maps-status/",
                },
                { label: "Local Habits", link: "/guide/everyday-control/local-habits/" },
                {
                  label: "Manual Energy setup",
                  link: "/guide/everyday-control/manual-energy-setup/",
                },
              ],
            },
            {
              label: "Settings",
              items: [
                { label: "Settings guides", link: "/guide/settings/" },
                { label: "Appearance", link: "/guide/settings/appearance/" },
                { label: "Card interactions", link: "/guide/settings/card-interactions/" },
                { label: "Manage providers", link: "/guide/settings/manage-providers/" },
                { label: "Sidebar extensions", link: "/guide/settings/sidebar-extensions/" },
                { label: "Localization", link: "/guide/settings/localization/" },
              ],
            },
            {
              label: "Troubleshooting",
              items: [
                { label: "Troubleshooting overview", link: "/guide/troubleshooting/" },
                { label: "Camera playback", link: "/guide/troubleshooting/camera-playback/" },
                { label: "Missing entities", link: "/guide/troubleshooting/missing-entities/" },
                { label: "Connection and sign-in", link: "/guide/troubleshooting/connection/" },
                {
                  label: "Unavailable features",
                  link: "/guide/troubleshooting/unavailable-features/",
                },
              ],
            },
          ],
        },
        { label: "Integrations", link: "/integrations/" },
        {
          label: "Developers",
          items: [
            { label: "Developer overview", link: "/developers/" },
            { label: "Contributing", link: "/developers/contributing/" },
            { label: "Code of Conduct", link: "/developers/code-of-conduct/" },
          ],
        },
        {
          label: "Discover",
          items: [
            { label: "Resources", link: "/resources/" },
            { label: "Changelog", link: "/changelog/" },
            { label: "Roadmap", link: "/roadmap/" },
          ],
        },
        {
          label: "Brand",
          items: [
            { label: "Brand overview", link: "/brand/" },
            { label: "Foundations", link: "/brand/foundations/" },
            { label: "Voice and messaging", link: "/brand/voice/" },
            { label: "Visual identity", link: "/brand/visual/" },
            { label: "Product card grammar", link: "/brand/cards/" },
            { label: "Assets", link: "/brand/assets/" },
            { label: "Governance", link: "/brand/governance/" },
            { label: "Trademark policy", link: "/brand/trademark/" },
          ],
        },
        {
          label: "Support",
          items: [
            { label: "Help and safety", link: "/help/" },
            { label: "Security", link: "/security/" },
          ],
        },
      ],
    }),
  ],
});
