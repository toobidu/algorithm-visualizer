export {
  COMMAND_PREFIX,
  classifyLine,
  frame,
  splitStream,
  type FramedLine,
  type SplitStream,
} from './framing';

export {
  NON_FINITE_KEY,
  SAFE_INTEGER_LIMIT,
  isSafeForProtocol,
  decodeNumber,
  encodeNumber,
  isNonFiniteNumber,
  serializeJson,
  serializeNumber,
  type JsonPrimitive,
  type JsonValue,
  type NonFiniteNumber,
  type NonFiniteTag,
} from './json';

export {
  commandSchema,
  isDelay,
  isSetRoot,
  serializeCommand,
  type Chunk,
  type Command,
} from './command';

export {
  CONSTRUCTOR_SPEC,
  GLOBAL_METHODS,
  LAYOUT_CLASSES,
  METHODS,
  TRACER_CLASSES,
  isArityValid,
  isGlobalMethod,
  isLayoutClass,
  isTracerClass,
  type GlobalMethod,
  type LayoutClass,
  type MethodSpec,
  type TracerClass,
} from './registry';

export { parseStdout, type ParseIssue, type ParseResult } from './parse';

export { isValidCursor, toChunks } from './chunk';

export { FIXTURES, fixtureByName, syntheticTrace, toStdout, type Fixture } from './fixtures';
