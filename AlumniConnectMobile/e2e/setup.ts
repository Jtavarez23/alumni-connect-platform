/**
 * E2E Test Setup for Alumni Connect Mobile
 */

import { DetoxCircusEnvironment, SpecReporter, WorkerAssignReporter } from 'detox/runners/jest';

const adapter = new DetoxCircusEnvironment({
  initTimeout: 300000,
  launchAppTimeout: 300000,
  attachTimeout: 300000,
});

const specReporter = new SpecReporter({
  jest: {
    rootDir: process.cwd(),
  },
});

const workerReporter = new WorkerAssignReporter();

// Add custom matchers for mobile testing
expect.extend({
  async toBeVisibleOnScreen(element) {
    try {
      await expect(element).toBeVisible();
      return {
        pass: true,
        message: () => 'Element is visible on screen',
      };
    } catch (error) {
      return {
        pass: false,
        message: () => `Element is not visible on screen: ${error}`,
      };
    }
  },

  async toCompleteGesture(element, gesture) {
    try {
      await element[gesture]();
      return {
        pass: true,
        message: () => `Gesture ${gesture} completed successfully`,
      };
    } catch (error) {
      return {
        pass: false,
        message: () => `Gesture ${gesture} failed: ${error}`,
      };
    }
  },
});