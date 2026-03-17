import boxen from 'boxen';
import chalk from 'chalk';
import figlet from 'figlet';
import { teen } from 'gradient-string';

export const intro = () => {
  console.clear();

  const bigTitle = figlet.textSync('PNPMT', { font: 'Speed' });
  const gradientTitle = teen(bigTitle);

  const header = boxen(
    gradientTitle +
      '\n' +
      chalk.bold.cyan('  (T for Traversal) - PNPM Workspace Explorer'),
    {
      padding: 1,
      borderStyle: 'none',
    },
  );

  console.log(header);
};
