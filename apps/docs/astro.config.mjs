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
        { label: "Integrations", link: "/integrations/" },
        {
          label: "Developers",
          items: [
            { label: "Developer overview", link: "/developers/" },
            { label: "Contributing", link: "/developers/contributing/" },
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
