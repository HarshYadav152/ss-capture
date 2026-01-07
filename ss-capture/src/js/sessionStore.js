// ES module wrapper around the commonjs core
import core from './sessionStore.core.js';

export const addScreenshot = core.addScreenshot;
export const getScreenshots = core.getScreenshots;
export const deleteScreenshot = core.deleteScreenshot;
export const clearScreenshots = core.clearScreenshots;
export const setScreenshots = core.setScreenshots;
export const setNotifier = core.setNotifier;
export default core;
