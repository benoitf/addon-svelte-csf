import {
  createASTObjectExpression,
  createASTProperty,
  findPropertyParametersIndex,
  getParametersPropertyValue,
} from '../shared/description.js';

import type { extractStoriesNodesFromExportDefaultFn } from '../../../parser/extract/compiled/stories.js';
import type {
  SvelteASTNodes,
  extractSvelteASTNodes,
} from '../../../parser/extract/svelte/nodes.js';

import { getStoryPropsObjectExpression } from '../../../parser/analyse/story/compiled/props.js';
import { getStoryChildrenRawCode } from '../../../parser/analyse/story/svelte/children.js';

interface Params {
  nodes: {
    component: {
      svelte: SvelteASTNodes['storyComponents'][number];
      compiled: Awaited<ReturnType<typeof extractStoriesNodesFromExportDefaultFn>>[number];
    };
    svelte: Awaited<ReturnType<typeof extractSvelteASTNodes>>;
  };
  filename?: string;
  originalCode: string;
}

/**
 * Insert addon's internal object `__svelteCsf`
 * to `parameters` of every `<Story />` component **into the compiled code**.
 */
export function insertSvelteCSFToStoryParameters(params: Params) {
  const { nodes, filename, originalCode } = params;
  const { component, svelte } = nodes;

  const storyPropsObjectExpression = getStoryPropsObjectExpression({
    node: component.compiled,
    filename,
  });

  if (findPropertyParametersIndex(storyPropsObjectExpression) === -1) {
    storyPropsObjectExpression.properties.push(
      createASTProperty('parameters', createASTObjectExpression())
    );
  }

  const rawCode = getStoryChildrenRawCode({
    nodes: {
      component: component.svelte.component,
      svelte,
    },
    originalCode,
  });

  getParametersPropertyValue(storyPropsObjectExpression).properties.push(
    createASTProperty(
      '__svelteCsf',
      createASTObjectExpression([
        createASTProperty('rawCode', {
          type: 'Literal',
          value: rawCode,
        }),
      ])
    )
  );
}