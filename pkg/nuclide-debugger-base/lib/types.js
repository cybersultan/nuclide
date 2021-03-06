/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 */

export type AtomNotificationType = 'info' | 'warning' | 'error' | 'fatalError';
export type AtomNotification = {
  type: AtomNotificationType,
  message: string,
};

export type ThreadColumn = {
  key: string,
  title: string,
};
