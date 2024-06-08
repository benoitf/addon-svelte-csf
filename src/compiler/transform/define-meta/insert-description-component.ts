import { logger } from '@storybook/client-logger';
import dedent from 'dedent';

import {
  createASTObjectExpression,
  createASTProperty,
  findASTPropertyIndex,
  findPropertyDescriptionIndex,
  findPropertyDocsIndex,
  findPropertyParametersIndex,
  getDescriptionPropertyValue,
  getDocsProperty,
  getDocsPropertyValue,
  getParametersPropertyValue,
} from '../shared/description.js';

import type { SvelteASTNodes } from '../../../parser/extract/svelte/nodes.js';
import type { CompiledASTNodes } from '../../../parser/extract/compiled/nodes.js';

import { getDefineMetaFirstArgumentNode } from '../../../parser/analyse/define-meta/first-argument.js';

interface Params {
  nodes: {
    compiled: CompiledASTNodes;
    svelte: SvelteASTNodes;
  };
  filename?: string;
}

/**
 * Attempt to insert JSDoc comment above the `defineMeta()` call.
 *
 * Before:
 *
 * ```js
 * // Some description about the component
 * const { Story } = defineMeta({});
 * ```
 *
 * After:
 * ```js
 * // Some description about the component
 * const { Story } = defineMeta({
 *   parameters: {
 *     docs: {
 *       description: { component: "Some description about the component" },
 *     },
 *   },
 * });
 * ```
 */
export function insertDefineMetaJSDocCommentAsDescription(params: Params): void {
  const { nodes, filename } = params;
  const { compiled, svelte } = nodes;
  const { defineMetaVariableDeclaration } = svelte;
  const { leadingComments } = defineMetaVariableDeclaration;

  if (!leadingComments) {
    return;
  }

  const defineMetaFirstArgumentObjectExpression = getDefineMetaFirstArgumentNode({
    nodes: compiled,
    filename,
  });

  if (findPropertyParametersIndex(defineMetaFirstArgumentObjectExpression) === -1) {
    defineMetaFirstArgumentObjectExpression.properties.push(
      createASTProperty('parameters', createASTObjectExpression())
    );
  }

  if (findPropertyDocsIndex(defineMetaFirstArgumentObjectExpression) === -1) {
    getParametersPropertyValue(defineMetaFirstArgumentObjectExpression).properties.push(
      createASTProperty('docs', createASTObjectExpression())
    );
  }

  if (!getDocsProperty(defineMetaFirstArgumentObjectExpression)) {
    throw new Error('it was undefined');
  }

  if (findPropertyDescriptionIndex(defineMetaFirstArgumentObjectExpression) === -1) {
    getDocsPropertyValue(defineMetaFirstArgumentObjectExpression).properties.push(
      createASTProperty('description', createASTObjectExpression())
    );
  }

  if (
    findASTPropertyIndex(
      'component',
      getDescriptionPropertyValue(defineMetaFirstArgumentObjectExpression)
    ) !== -1
  ) {
    logger.warn(
      `defineMeta() already has explictly set description. Ignoring the JSDoc comment above. Stories file: ${filename}`
    );

    return;
  }

  getDescriptionPropertyValue(defineMetaFirstArgumentObjectExpression).properties.push(
    createASTProperty('component', {
      type: 'Literal',
      value: dedent(leadingComments[0].value),
    })
  );
}