import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://afiiif.github.io',
  base: 'dom-dom-factory',
  integrations: [
    tailwind({
      nesting: true,
    }),
    mdx(),
  ],
});
