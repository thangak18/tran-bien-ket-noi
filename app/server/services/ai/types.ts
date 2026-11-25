import { Category } from '../../../src/domain/types';

export interface SuggestionResult {
  category: Category | null;
  confidence: number;
  reason: string;
  provider: 'deepseek' | 'mock';
}

export interface ImageInput {
  dataUrl?: string;
  buffer?: Uint8Array;
  mimeType?: string;
}

export interface CategorySuggester {
  readonly provider: 'deepseek' | 'mock';
  suggest(image: ImageInput): Promise<SuggestionResult>;
}
