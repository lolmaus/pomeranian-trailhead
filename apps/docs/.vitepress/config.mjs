export default {
  title: "Pomeranian",
  description: "Readable, typed page objects for Playwright. Development documentation.",
  base: "/",
  cleanUrls: false,
  themeConfig: {
    nav: [
      { text: "Introduction", link: "/" },
      { text: "Getting started", link: "/getting-started" },
      { text: "Guides", link: "/guides/testing" },
      { text: "API reference", link: "/api/" },
      { text: "Contributing", link: "/contributing" },
    ],
    sidebar: [
      {
        text: "Start here",
        items: [
          { text: "Introduction and value", link: "/" },
          { text: "Installation and status", link: "/installation" },
          { text: "Getting started", link: "/getting-started" },
          { text: "Concepts", link: "/concepts" },
        ],
      },
      {
        text: "Guides and recipes",
        items: [
          { text: "Construction and targets", link: "/guides/construction" },
          { text: "Library authoring", link: "/guides/authoring" },
          { text: "Standalone Playwright", link: "/recipes/standalone" },
          { text: "Multiple Pages and frames", link: "/recipes/multiple-pages" },
          { text: "Chromium testing", link: "/guides/testing" },
          { text: "Explore the factory proof", link: "/guides/factory-proof" },
          { text: "Author documentation", link: "/guides/documentation" },
          { text: "Isolate a DOM scenario", link: "/recipes/inline-html" },
        ],
      },
      {
        text: "API reference",
        items: [
          { text: "Package status", link: "/api/" },
          { text: "@pomeranian/core", link: "/api/core" },
          { text: "@pomeranian/lib-essential", link: "/api/lib-essential" },
          { text: "@pomeranian/lib-ant-design", link: "/api/lib-ant-design" },
          { text: "Development infrastructure", link: "/reference/development/" },
          { text: "Authoring helper context", link: "/reference/authoring-helpers" },
          { text: "Prototype helper context", link: "/reference/prototype-helpers" },
        ],
      },
      { text: "Contributing", link: "/contributing" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/lolmaus/pomeranian-trailhead" }],
    footer: {
      message:
        "Unreleased development documentation from main. APIs and prototypes are labelled separately.",
    },
  },
};
