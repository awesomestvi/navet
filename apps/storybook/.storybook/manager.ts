import { addons } from 'storybook/manager-api';
import { navetStorybookTheme } from './navet-theme';
import managerCss from './manager.css?raw';

const managerStyleId = 'navet-storybook-manager-styles';

function applyManagerStyles(css: string) {
  const style = document.getElementById(managerStyleId) ?? document.createElement('style');
  style.id = managerStyleId;
  style.textContent = css;

  if (!style.isConnected) {
    document.head.appendChild(style);
  }
}

applyManagerStyles(managerCss);

addons.setConfig({
  theme: navetStorybookTheme,
});
