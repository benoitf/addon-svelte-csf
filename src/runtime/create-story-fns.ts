/* eslint-env browser */
import { combineTags } from '@storybook/csf';
import { logger } from '@storybook/client-logger';
import { combineArgs, combineParameters } from '@storybook/preview-api';
import type { Meta, StoryFn } from '@storybook/svelte';
import { mount, unmount, type ComponentType } from 'svelte';

import StoriesExtractor from './StoriesExtractor.svelte';
import StoryRenderer from './StoryRenderer.svelte';
import type { StoriesRepository } from './contexts/extractor.svelte.js';

const createFragment = document.createDocumentFragment
  ? () => document.createDocumentFragment()
  : () => document.createElement('div');

/**
 * @module
 * Called from a bundler.
 *
 * It mounts the Stories components in a context which disables
 * the rendering of every `<Story />`,
 * but instead collects names and properties.
 *
 * For every discovered `<Story />`, it creates a `StoryFn` which
 * instantiate the main Stories component: Every Story but
 * the one selected is disabled.
 */
// TODO: I'm not sure the 'meta' is necessary here. As long as it's default exported, SB should internally combine it with the stories. Except for the play logic below, that looks funky, need to ask Pablo about that.
export const createStoryFns = <TMeta extends Meta>(Stories: ComponentType, meta: TMeta) => {
  const repository: StoriesRepository<TMeta> = {
    stories: new Map(),
  };

  try {
    const context = mount(StoriesExtractor, {
      target: createFragment() as Element,
      props: {
        Stories,
        repository: () => repository,
      },
    });

    unmount(context);
  } catch (e: any) {
    logger.error(`Error in mounting stories ${e.toString()}`, e);
  }

  const stories: Record<string, StoryFn<StoryRenderer<TMeta>>> = {};

  for (const [name, story] of repository.stories) {
    // NOTE: We can't use StoryObj, because `@storybook/svelte` accepts `StoryFn` for now
    const storyFn: StoryFn<StoryRenderer<TMeta>> = (args, storyContext) => {
      return {
        Component: StoryRenderer<TMeta>,
        props: {
          storyName: story.name,
          Stories,
          storyContext,
          args,
        },
      };
    };
    storyFn.storyName = story.name;
    storyFn.args = combineArgs(meta.args, story.args);
    storyFn.parameters = combineParameters({}, meta.parameters, story.parameters);
    storyFn.tags = combineTags(...(meta.tags ?? []), ...(story.tags ?? []));

    // TODO: Restore this feature
    // if (storyMeta.rawSource) {
    // 	storyFn.parameters = combineParameters(storyFn.parameters, {
    // 		storySource: {
    // 			source: storyMeta.rawSource,
    // 		},
    // 	});
    // }
    //
    // if (storyMeta.source) {
    // 	let code: string | undefined;
    //
    // 	if (storyMeta.source === true && storyMeta.rawSource) {
    // 		code = storyMeta.rawSource;
    // 	}
    //
    // 	if (typeof storyMeta.source === "string") {
    // 		code = storyMeta.source;
    // 	}
    //
    // 	if (code) {
    // 		storyFn.parameters = combineParameters(storyFn.parameters, {
    // 			docs: {
    // 				source: { code },
    // 			},
    // 		});
    // 	}
    // }

    const play = meta.play ?? story.play;

    if (play) {
      /*
       * The 'play' function should be delegated to the real play Story function
       * in order to be run into the component scope.
       */
      storyFn.play = (storyContext) => {
        const delegate = storyContext.playFunction?.__play;

        if (delegate) {
          return delegate(storyContext);
        }

        return play(storyContext);
      };
    }

    stories[name] = storyFn;
  }

  return stories;
};