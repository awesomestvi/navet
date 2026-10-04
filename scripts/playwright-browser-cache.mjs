import { homedir } from 'node:os';
import path from 'node:path';

// Resolve before Storybook enters its isolated configuration home. Browser downloads
// belong to Playwright's existing user cache, shared by CLI and MCP fixture tests.
const userDirectory = homedir();
const configured = process.env.PLAYWRIGHT_BROWSERS_PATH ??
  process.env.npm_config_playwright_browsers_path ?? process.env.npm_package_config_playwright_browsers_path;
let cache;
if (process.platform === 'darwin') cache = path.join(userDirectory, 'Library', 'Caches');
else if (process.platform === 'linux') cache = process.env.XDG_CACHE_HOME || path.join(userDirectory, '.cache');
else if (process.platform === 'win32') cache = process.env.LOCALAPPDATA || path.join(userDirectory, 'AppData', 'Local');
else throw new Error('Unsupported Playwright browser-cache platform.');
console.log(configured || path.resolve(process.env.INIT_CWD || process.cwd(), cache, 'ms-playwright'));
