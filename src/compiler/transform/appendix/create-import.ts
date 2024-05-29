import pkg from '@storybook/addon-svelte-csf/package.json' with { type: 'json' };
import type { ImportDeclaration } from 'estree';

/**
 * the export is defined in the `package.json` export map
 */
export function createImport(): ImportDeclaration {
  const imported = {
    type: 'Identifier',
    // WARN: Tempting to use `createStoryFns.name` here.
    // It will break, because this function imports `*.svelte` files.
    name: 'createStoryFns',
  } as const;

  return {
    type: 'ImportDeclaration',
    source: {
      type: 'Literal',
      // TODO: Probably possible to achieve picking the whole path from `pkg.exports` with Object.keys or something like that
      value: `${pkg.name}/internal/create-story-fns`,
    },
    specifiers: [
      {
        type: 'ImportSpecifier',
        imported,
        local: imported,
      },
    ],
  };
}
