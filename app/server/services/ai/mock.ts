import { CategorySuggester, ImageInput, SuggestionResult } from './types';

export class MockSuggester implements CategorySuggester {
  readonly provider = 'mock' as const;

  async suggest(image: ImageInput): Promise<SuggestionResult> {
    const url = (image.dataUrl || '') + ' ' + (image.path || '');

    if (url.includes('den_duong')) {
      return {
        category: 'den_duong',
        confidence: 0.95,
        reason: 'Phát hiện sự cố hệ thống chiếu sáng đô thị',
        provider: 'mock',
      };
    }

    if (url.includes('ngap_nuoc')) {
      return {
        category: 'ngap_nuoc',
        confidence: 0.92,
        reason: 'Phát hiện tình trạng ngập úng, nước đọng mặt đường',
        provider: 'mock',
      };
    }

    if (url.includes('rac_thai')) {
      return {
        category: 'rac_thai',
        confidence: 0.94,
        reason: 'Phát hiện điểm tập kết rác thải tự phát hoặc bừa bãi',
        provider: 'mock',
      };
    }

    if (url.includes('mat_duong')) {
      return {
        category: 'mat_duong',
        confidence: 0.93,
        reason: 'Phát hiện ổ gà, nứt vỡ hoặc sụt lún mặt đường',
        provider: 'mock',
      };
    }

    // Nếu không thuộc các ảnh mẫu quen thuộc
    return {
      category: null,
      confidence: 0.3,
      reason: 'Không nhận diện được loại sự cố qua dữ liệu mô phỏng',
      provider: 'mock',
    };
  }
}
