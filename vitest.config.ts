import { defineConfig } from 'vitest/config';

// Unit and image-regression tests run in plain Node.
// src/core/** is DOM-free by design (PRODUCT_SPEC.md §77.3), so no jsdom or
// node-canvas is needed to test the image algorithms.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    globals: false,
  },
});
