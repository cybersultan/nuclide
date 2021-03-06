/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

import type {NuclideUri} from '../../commons-node/nuclideUri';
import typeof * as HackService from '../../nuclide-hack-rpc/lib/HackService';
import type {HackLanguageService} from '../../nuclide-hack-rpc/lib/HackService-types';
import type {ServerConnection} from '../../nuclide-remote-connection';
import type {
  AtomLanguageServiceConfig,
} from '../../nuclide-language-service/lib/AtomLanguageService';
import type {Completion} from '../../nuclide-language-service/lib/LanguageService';

import invariant from 'assert';

import {getServiceByConnection} from '../../nuclide-remote-connection';
import {getConfig, logger} from './config';
import {getNotifierByConnection} from '../../nuclide-open-files';
import {AtomLanguageService} from '../../nuclide-language-service';
import {HACK_GRAMMARS} from '../../nuclide-hack-common';
import {
  sortAndFilterCompletions,
  getResultPrefix,
  getReplacementPrefix,
  findHackPrefix,
} from '../../nuclide-hack-common/lib/autocomplete';
import {getFileSystemServiceByNuclideUri} from '../../nuclide-remote-connection';
import nuclideUri from '../../commons-node/nuclideUri';
import passesGK from '../../commons-node/passesGK';

const HACK_SERVICE_NAME = 'HackService';

async function getUseIdeConnection(): Promise<boolean> {
  return getConfig().useIdeConnection || passesGK('nuclide_hack_use_persistent_connection');
}

async function connectionToHackService(
  connection: ?ServerConnection,
): Promise<HackLanguageService> {
  const hackService: HackService = getServiceByConnection(HACK_SERVICE_NAME, connection);
  const config = getConfig();
  const useIdeConnection = await getUseIdeConnection();
  const fileNotifier = await getNotifierByConnection(connection);
  const languageService = await hackService.initialize(
    config.hhClientPath,
    useIdeConnection,
    config.logLevel,
    fileNotifier);

  return languageService;
}

async function createLanguageService(): Promise<AtomLanguageService<HackLanguageService>> {
  const useIdeConnection = await getUseIdeConnection();

  const diagnosticsConfig = useIdeConnection
    ? {
      version: '0.2.0',
      analyticsEventName: 'hack.observe-diagnostics',
    }
    : {
      version: '0.1.0',
      shouldRunOnTheFly: false,
      analyticsEventName: 'hack.run-diagnostics',
    };

  const atomConfig: AtomLanguageServiceConfig = {
    name: 'Hack',
    grammars: HACK_GRAMMARS,
    highlight: {
      version: '0.0.0',
      priority: 1,
      analyticsEventName: 'hack.codehighlight',
    },
    outline: {
      version: '0.0.0',
      priority: 1,
      analyticsEventName: 'hack.outline',
    },
    coverage: {
      version: '0.0.0',
      priority: 10,
      analyticsEventName: 'hack:run-type-coverage',
    },
    definition: {
      version: '0.0.0',
      priority: 20,
      definitionEventName: 'hack.get-definition',
      definitionByIdEventName: 'hack.get-definition-by-id',
    },
    typeHint: {
      version: '0.0.0',
      priority: 1,
      analyticsEventName: 'hack.typeHint',
    },
    codeFormat: {
      version: '0.0.0',
      priority: 1,
      analyticsEventName: 'hack.formatCode',
      formatEntireFile: false,
    },
    findReferences: {
      version: '0.0.0',
      analyticsEventName: 'hack:findReferences',
    },
    evaluationExpression: {
      version: '0.0.0',
      analyticsEventName: 'hack.evaluationExpression',
    },
    autocomplete: {
      version: '2.0.0',
      inclusionPriority: 1,
      // The context-sensitive hack autocompletions are more relevant than snippets.
      suggestionPriority: 3,
      disableForSelector: null,
      excludeLowerPriority: false,
      analyticsEventName: 'hack.getAutocompleteSuggestions',
      autocompleteCacherConfig: {
        updateResults: updateAutocompleteResults,
        gatekeeper: 'nuclide_hack_fast_autocomplete',
      },
      onDidInsertSuggestionAnalyticsEventName: 'hack.autocomplete-chosen',
    },
    diagnostics: diagnosticsConfig,
  };

  return new AtomLanguageService(connectionToHackService, atomConfig, logger);
}

// This needs to be initialized eagerly for Hack Symbol search and the HHVM Toolbar.
export let hackLanguageService: Promise<AtomLanguageService<HackLanguageService>>
  = createLanguageService();

export function resetHackLanguageService(): void {
  hackLanguageService.then(value => value.dispose());
  // Reset to an unactivated LanguageService when the Hack package is deactivated.
  // TODO: Sort out the dependencies between the HHVM toolbar, quick-open and Hack.
  hackLanguageService = createLanguageService();
}

export async function getHackLanguageForUri(uri: ?NuclideUri): Promise<?HackLanguageService> {
  return (await hackLanguageService).getLanguageServiceForUri(uri);
}

export async function isFileInHackProject(fileUri: NuclideUri): Promise<boolean> {
  const fileSystemService = getFileSystemServiceByNuclideUri(fileUri);
  const foundDir = await fileSystemService.findNearestFile(
    '.hhconfig',
    nuclideUri.getPath(fileUri),
  );
  return foundDir != null;
}

function updateAutocompleteResults(
  request: atom$AutocompleteRequest,
  firstResult: ?Array<Completion>,
): ?Array<Completion> {
  if (firstResult == null) {
    return null;
  }
  const replacementPrefix = findHackPrefix(request.editor.getBuffer(), request.bufferPosition);
  const updatedCompletions = updateReplacementPrefix(request, firstResult, replacementPrefix);
  return sortAndFilterCompletions(updatedCompletions, replacementPrefix);
}

function updateReplacementPrefix(
  request: atom$AutocompleteRequest,
  firstResult: Array<Completion>,
  prefixCandidate: string,
): Array<Completion> {
  const {editor, bufferPosition} = request;
  const contents = editor.getText();
  const offset = editor.getBuffer().characterIndexForPosition(bufferPosition);
  return firstResult.map(completion => {
    const name = completion.displayText;
    invariant(name != null);
    const resultPrefix = getResultPrefix(contents, offset, name);
    const replacementPrefix = getReplacementPrefix(resultPrefix, prefixCandidate);
    return {
      ...completion,
      replacementPrefix,
    };
  });
}
