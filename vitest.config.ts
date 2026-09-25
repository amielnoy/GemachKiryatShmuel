import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ברירת המחדל היא node. קבצים שצריכים localStorage מבקשים jsdom
    // בשורת docblock משלהם, כדי לא לשלם על סביבת דפדפן בכל קובץ.
    environment: 'node',
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: 'test-results/junit.xml' },
  },
});
