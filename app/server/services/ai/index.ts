import { env } from '../../env';
import { CategorySuggester } from './types';
import { MockSuggester } from './mock';
import { DeepSeekSuggester } from './deepseek';

export * from './types';
export * from './parser';
export * from './mock';
export * from './deepseek';

export function getCategorySuggester(): CategorySuggester {
  if (env.AI_PROVIDER === 'deepseek') {
    return new DeepSeekSuggester();
  }
  return new MockSuggester();
}
