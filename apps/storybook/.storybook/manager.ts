import { createElement, type ReactNode } from 'react';
import { addons, types } from 'storybook/manager-api';
import { DiscordMark, RedditMark } from '../../../packages/app/src/components/shared/social-marks';
import { COMMUNITY_URLS } from '../../../packages/app/src/constants/urls';
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

function CommunityLink({ href, label, icon }: { href: string; label: string; icon: ReactNode }) {
  return createElement(
    'a',
    {
      href,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'navet-storybook-community-link',
      'aria-label': `Navet on ${label}`,
      title: label,
    },
    icon
  );
}

addons.register('navet/community-links', () => {
  addons.add('navet/community-links/toolbar', {
    title: 'Navet community',
    type: types.TOOLEXTRA,
    render: () =>
      createElement(
        'nav',
        { className: 'navet-storybook-community-links', 'aria-label': 'Navet community' },
        createElement(CommunityLink, {
          href: COMMUNITY_URLS.discord,
          label: 'Discord',
          icon: createElement(DiscordMark, { width: 14, height: 14 }),
        }),
        createElement(CommunityLink, {
          href: COMMUNITY_URLS.reddit,
          label: 'Reddit',
          icon: createElement(RedditMark, { width: 14, height: 14 }),
        })
      ),
  });
});

addons.setConfig({
  theme: navetStorybookTheme,
});
