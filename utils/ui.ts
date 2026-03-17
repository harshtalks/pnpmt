import { passion } from 'gradient-string';
import cfonts from 'cfonts';

export const intro = () => {
  console.clear();

  cfonts.say('PNPMT', {
    font: 'block', // define the font face
    align: 'left', // define text alignment
  });

  console.log(passion('(T for Traversal) - PNPM Workspace Explorer\n\n'));
};
