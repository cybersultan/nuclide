/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

import {compareHackCompletions} from '../lib/autocomplete';

function createCompletion(text: string, prefix: string = ''): atom$AutocompleteSuggestion {
  return {
    snippet: text + '()',
    displayText: text,
    rightLabel: 'function',
    replacementPrefix: prefix,
  };
}

const c1:atom$AutocompleteSuggestion = createCompletion('GetAaa');
const c2:atom$AutocompleteSuggestion = createCompletion('getAzzz');
const c3:atom$AutocompleteSuggestion = createCompletion('aa_getaaa');
const c4:atom$AutocompleteSuggestion = createCompletion('zz_getAaa');
const c5:atom$AutocompleteSuggestion = createCompletion('aa_getAaa');
const c6:atom$AutocompleteSuggestion = createCompletion('_aa_getAaa');
const c7:atom$AutocompleteSuggestion = createCompletion('zz_getaaaa');

describe('autocomplete', () => {
  describe('compareHackCompletions()', () => {
    it('prefers prefix case sensitive matches to prefix case insensitive + alphabetical'
      + ' order', () => {
      const completions = [c1, c2];
      const comparator = compareHackCompletions('getA');
      expect(completions.sort(comparator)).toEqual(
        [c2, c1],
      );
    });

    it('prefers prefix case insensitive matches to case insensitive non-prefix matches +'
      + ' alphabetical order', () => {
      const completions = [c3, c2];
      const comparator = compareHackCompletions('getA');
      expect(completions.sort(comparator)).toEqual(
        [c2, c3],
      );
    });

    it('prefers non-prefix case sensitive matches to case insensitive non-prefix matches +'
      + ' alphabetical order', () => {
      const completions = [c3, c4];
      const comparator = compareHackCompletions('getA');
      expect(completions.sort(comparator)).toEqual(
        [c4, c3],
      );
    });

    it('prefers alphabetical order when both are of the same type', () => {
      const completions = [c4, c5];
      const comparator = compareHackCompletions('getA');
      expect(completions.sort(comparator)).toEqual(
        [c5, c4],
      );
    });

    it('penalizes a match if is private function, even if matching with case sensitivity', () => {
      const completions = [c6, c7];
      const comparator = compareHackCompletions('getA');
      expect(completions.sort(comparator)).toEqual(
        [c7, c6],
      );
    });

    it('prefer completions with longer prefixes', () => {
      const comp1 = createCompletion(':foo', ':f');
      const comp2 = createCompletion('foo', 'f');
      const completions = [comp2, comp1];
      const comparator = compareHackCompletions('f');
      expect(completions.sort(comparator)).toEqual(
        [comp1, comp2],
      );
    });

    it('sorts the completion results in a meaningful order', () => {
      const comps = [
        createCompletion('_getAbc()'),
        createCompletion('_getAab()'),
        createCompletion('getAppend()'),
        createCompletion('getAddendum()'),
        createCompletion('doOrGetACup()'),
        createCompletion('_doOrGetACup()'),
      ];
      const comparator = compareHackCompletions('getA');
      expect(comps.sort(comparator)).toEqual([
        createCompletion('getAddendum()'),
        createCompletion('getAppend()'),
        createCompletion('doOrGetACup()'),
        createCompletion('_getAab()'),
        createCompletion('_getAbc()'),
        createCompletion('_doOrGetACup()'),
      ]);
    });
  });
});
