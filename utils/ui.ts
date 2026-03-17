import boxen from 'boxen';
import chalk from 'chalk';
import figlet from 'figlet';
import { passion } from 'gradient-string';

export const intro = () => {
  console.clear();

  const bigTitle = figlet.textSync('PNPMT', {
    whitespaceBreak: true,
  });
  const gradientTitle = passion(bigTitle);

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
