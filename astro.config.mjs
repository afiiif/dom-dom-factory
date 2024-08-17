import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: process.env.NODE_ENV === 'development' ? undefined : 'https://afiiif.github.io',
  base: process.env.NODE_ENV === 'development' ? undefined : 'dom-dom-factory',
  integrations: [
    tailwind({
      nesting: true,
    }),
    mdx(),
  ],
});
