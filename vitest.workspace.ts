import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*',
  'apps/*',
  'config',
  'tracers/javascript',
  'tracers/_conformance',
]);
