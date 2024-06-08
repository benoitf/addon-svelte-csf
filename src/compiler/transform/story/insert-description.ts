import { logger } from '@storybook/client-logger';
import dedent from 'dedent';

import {
  createASTObjectExpression,
  createASTProperty,
  findASTPropertyIndex,
  findPropertyDescriptionIndex,
  findPropertyDocsIndex,
  findPropertyParametersIndex,
  getParametersPropertyValue,
  getDocsPropertyValue,
  getDescriptionPropertyValue,
} from '#compiler/transform/shared/description';

import type { extractStoriesNodesFromExportDefaultFn } from '#parser/extract/compiled/stories';
import type { SvelteASTNodes } from '#parser/extract/svelte/nodes';
import { getStoryPropsObjectExpression } from '#parser/analyse/story/compiled/props';

interface Params {
  nodes: {
    svelte: SvelteASTNodes['storyComponents'][number];
    compiled: Awaited<ReturnType<typeof extractStoriesNodesFromExportDefaultFn>>[number];
  };
  filename?: string;
}

/**
 * Attempt to insert HTML comment above the `<Story />` component as a description **into the compiled code**.
 * If the user did explictly set `parameters.docs.description.story` and the HTML comment exists, then it will log a warning.
 */
export function insertStoryHTMLCommentAsDescription(params: Params) {
  const { nodes, filename } = params;
  const { svelte, compiled } = nodes;
  const { comment } = svelte;

  if (!comment) {
    return;
  }

  const storyPropsObjectExpression = getStoryPropsObjectExpression({
    node: compiled,
    filename,
  });

  if (findPropertyParametersIndex(storyPropsObjectExpression) === -1) {
    storyPropsObjectExpression.properties.push(
      createASTProperty('parameters', createASTObjectExpression())
    );
  }

  if (findPropertyDocsIndex(storyPropsObjectExpression) === -1) {
    getParametersPropertyValue(storyPropsObjectExpression).properties.push(
      createASTProperty('docs', createASTObjectExpression())
    );
  }

  if (findPropertyDescriptionIndex(storyPropsObjectExpression) === -1) {
    getDocsPropertyValue(storyPropsObjectExpression).properties.push(
      createASTProperty('description', createASTObjectExpression())
    );
  }

  if (
    findASTPropertyIndex('story', getDescriptionPropertyValue(storyPropsObjectExpression)) !== -1
  ) {
    // TODO: Improve warning message with better pointing out which story it is
    logger.warn(
      `One of <Story /> component(s) already has explictly set description. Ignoring the HTML comment above. Stories file: ${filename}`
    );

    return;
  }

  getDescriptionPropertyValue(storyPropsObjectExpression).properties.push(
    createASTProperty('story', {
      type: 'Literal',
      value: dedent(comment.data),
    })
  );

  if (compiled.type === 'CallExpression') {
    compiled.arguments[1] === storyPropsObjectExpression;
  } else if (
    compiled.type === 'ExpressionStatement' &&
    compiled.expression.type === 'CallExpression'
  ) {
    compiled.expression.arguments[1] === storyPropsObjectExpression;
  }
}
