import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  LocateFixed,
  Lock,
  MapPin,
  Mic,
  MicOff,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { nearestStreet, STREETS, WARD_CENTER } from '@/data/streets';
import { CATEGORY_CONFIGS, STATUS_CONFIGS } from '@/domain/constants';
import { canSendAnonymous, followerCount } from '@/domain/access';
import { findDuplicates } from '@/domain/duplicates';
import { formatDateTime, formatDistance, formatRelativeTime } from '@/domain/format';
import { CATEGORIES, Category, Report } from '@/domain/types';
import { getCurrentLocation } from '@/lib/geolocation';
import { compressImage } from '@/lib/image';
import { useAppStore } from '@/store/AppStore';
import { followReport, submitReport, subscribeLater, unsubscribe } from '@/store/citizenActions';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { MapView } from '@/components/map/MapView';
import { CategoryTile } from '@/components/citizen/CategoryTile';
import { PhoneOtpSheet } from '@/components/citizen/PhoneOtpSheet';
import { TrackingLinkCard } from '@/components/citizen/TrackingLinkCard';
import { SubscribeCard } from '@/components/citizen/SubscribeCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Toast, ToastType } from '@/components/ui/Toast';

interface SpeechRecognitionResultItem {
  transcript: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: {
    readonly length: number;
    readonly isFinal?: boolean;
    [index: number]: SpeechRecognitionResultItem;
  };
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex?: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous?: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface WindowWithSpeech {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

const MAX_TITLE_LENGTH = 90;
const MAX_DESCRIPTION_LENGTH = 300;
const MAX_PHOTOS = 5;
const FALLBACK_HERO_PHOTO = '/demo-photos/mat_duong/1.jpg';

const CATEGORY_TITLE_SUGGESTIONS: Record<Category, readonly string[]> = {
  den_duong: ['Đèn đường không sáng', 'Bóng đèn chập chờn ban đêm', 'Trụ đèn chiếu sáng bị hỏng'],
  ngap_nuoc: ['Ngập nước sâu sau mưa', 'Cống thoát nước bị nghẹt', 'Nước đọng tràn mặt đường'],
  rac_thai: [
    'Rác thải ứ đọng trên vỉa hè',
    'Điểm tập kết rác bốc mùi',
    'Rác sinh hoạt tràn lòng đường',
  ],
  mat_duong: [
    'Ổ gà lớn gây nguy hiểm',
    'Mặt đường bong tróc, sụt lún',
    'Nắp hố ga bị lệch / hư hỏng',
  ],
};

const CATEGORY_DESC_PHRASES: Record<Category, readonly string[]> = {
  den_duong: [
    'Khu vực tối gây mất an toàn ban đêm',
    'Đã hỏng từ vài ngày nay',
    'Cần kiểm tra đường dây / bóng đèn',
  ],
  ngap_nuoc: [
    'Nước rút rất chậm gây cản trở xe cộ',
    'Rác che kín miệng cống thoát nước',
    'Ngập sâu mỗi khi có mưa lớn',
  ],
  rac_thai: [
    'Tồn đọng nhiều ngày chưa được thu gom',
    'Bốc mùi ảnh hưởng hộ dân xung quanh',
    'Tràn ra phần đường xe chạy',
  ],
  mat_duong: [
    'Nguy hiểm cho người đi xe máy ban đêm',
    'Nằm ngay giữa làn đường lưu thông',
    'Đọng nước dễ gây trượt ngã',
  ],
};

const WIZARD_STEPS = [
  { step: 1, title: 'Loại phản ánh', shortTitle: 'Phân loại' },
  { step: 2, title: 'Vị trí phản ánh', shortTitle: 'Vị trí' },
  { step: 3, title: 'Mô tả & Liên hệ', shortTitle: 'Mô tả' },
] as const;

type WizardStep = 1 | 2 | 3;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as WindowWithSpeech;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function normalizeViText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function validateVietnamesePhone(raw: string): string | null {
  const clean = raw.replace(/\s+/g, '');
  if (!/^\d{10}$/.test(clean)) {
    return 'Số điện thoại gồm 10 chữ số (ví dụ: 0909000068)';
  }
  if (!/^(03|05|07|08|09)\d{8}$/.test(clean)) {
    return 'Số điện thoại không hợp lệ (cần đầu số 03, 05, 07, 08, 09)';
  }
  return null;
}

export function C04Confirm() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const { draft, settings, reports } = state;

  // Gợi ý loại sự cố mô phỏng từ ảnh (AC-C04-1 / B1)
  const aiSuggestedCategory: Category = useMemo(() => {
    if (draft.photos.length === 0) return 'mat_duong';
    const order: Category[] = ['mat_duong', 'den_duong', 'ngap_nuoc', 'rac_thai'];
    return order[(draft.photos.length - 1) % order.length] ?? 'mat_duong';
  }, [draft.photos.length]);

  const aiSuggestedConfig = useMemo(
    () => CATEGORY_CONFIGS.find((c) => c.key === aiSuggestedCategory) ?? CATEGORY_CONFIGS[0]!,
    [aiSuggestedCategory]
  );

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [selectedCategory, setSelectedCategory] = useState<Category>(
    draft.category ?? aiSuggestedCategory
  );
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [isAddressFocused, setIsAddressFocused] = useState<boolean>(false);
  const [osmSuggestions, setOsmSuggestions] = useState<
    Array<{ label: string; lat: number; lng: number }>
  >([]);
  const [locationNoteInput, setLocationNoteInput] = useState<string>(draft.locationNote ?? '');
  const [titleInput, setTitleInput] = useState<string>(draft.title ?? '');
  const [description, setDescription] = useState<string>(draft.description ?? '');
  // Để trống mặc định để người dùng tuỳ chọn nhập hoặc không nhập (không nhập -> gửi ẩn danh)
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');

  const [dismissedDuplicate, setDismissedDuplicate] = useState<boolean>(false);
  const [duplicateIndex, setDuplicateIndex] = useState<number>(0);
  const [isInspectDuplicateOpen, setIsInspectDuplicateOpen] = useState<boolean>(false);
  const [inspectPhotoIndex, setInspectPhotoIndex] = useState<number>(0);
  const [isOtpOpen, setIsOtpOpen] = useState<boolean>(false);
  const [isQuotaExceededOpen, setIsQuotaExceededOpen] = useState<boolean>(false);
  const [offlineError, setOfflineError] = useState<boolean>(false);
  const [pendingMode, setPendingMode] = useState<'phone' | 'anonymous' | null>(null);

  const [submittedAnonymousReport, setSubmittedAnonymousReport] = useState<Report | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const addPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputElRef = useRef<HTMLInputElement | null>(null);

  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const descriptionRef = useRef<string>(description);

  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const hasLocation =
    draft.lat !== undefined && draft.lng !== undefined && Boolean(draft.address?.trim());

  // Tự động thử lấy vị trí GPS khi vào trang nếu chưa có vị trí
  useEffect(() => {
    if (hasLocation) return;
    let active = true;
    Promise.resolve(getCurrentLocation({ timeoutMs: 4000 }))
      .then((coords) => {
        if (!active || !coords) return;
        const street = nearestStreet(coords.lat, coords.lng);
        dispatch({
          type: 'SET_DRAFT',
          payload: {
            lat: coords.lat,
            lng: coords.lng,
            address: `Đ. ${street.name}, P. Trấn Biên`,
          },
        });
      })
      .catch(() => {
        // Mặc định lấy tuyến đường trung tâm phường nếu GPS trên trình duyệt tắt để trải nghiệm liền mạch
        if (!active) return;
        const defaultStreet = STREETS[0]!;
        dispatch({
          type: 'SET_DRAFT',
          payload: {
            lat: defaultStreet.lat,
            lng: defaultStreet.lng,
            address: `Đ. ${defaultStreet.name}, P. Trấn Biên`,
          },
        });
      });

    return () => {
      active = false;
    };
  }, [dispatch, hasLocation]);

  // Kiểm tra phản ánh nghi trùng <= 50m trong 14 ngày (spec 3.5 / 03d)
  const duplicateMatches = useMemo(() => {
    if (!selectedCategory || draft.lat === undefined || draft.lng === undefined) {
      return [];
    }
    return findDuplicates(
      {
        category: selectedCategory,
        lat: draft.lat,
        lng: draft.lng,
      },
      reports,
      settings.demoNow
    );
  }, [selectedCategory, draft.lat, draft.lng, reports, settings.demoNow]);

  const topDuplicate =
    duplicateMatches[Math.min(duplicateIndex, Math.max(0, duplicateMatches.length - 1))] ??
    duplicateMatches[0] ??
    null;

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const syncDraftFields = (
    nextCategory?: Category,
    nextDescription?: string,
    nextLocNote?: string,
    nextTitle?: string
  ) => {
    dispatch({
      type: 'SET_DRAFT',
      payload: {
        category: nextCategory ?? selectedCategory,
        title: nextTitle !== undefined ? nextTitle : titleInput,
        description: nextDescription ?? description,
        locationNote: nextLocNote !== undefined ? nextLocNote : locationNoteInput,
      },
    });
  };

  const handleBack = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      setCurrentStep(1);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/bao-su-co/anh');
    }
  };

  const handleGoToLocationMap = () => {
    syncDraftFields(selectedCategory, description, locationNoteInput);
    navigate('/bao-su-co/vi-tri', { state: { fromConfirm: true } });
  };

  const handleSelectQuickStreet = (street: (typeof STREETS)[number]) => {
    setDismissedDuplicate(false);
    setDuplicateIndex(0);
    setIsAddressFocused(false);
    dispatch({
      type: 'SET_DRAFT',
      payload: {
        lat: street.lat,
        lng: street.lng,
        address: `Đ. ${street.name}, P. Trấn Biên`,
      },
    });
  };

  const handleAddressInputChange = (raw: string) => {
    setDismissedDuplicate(false);
    setDuplicateIndex(0);
    setIsAddressFocused(true);
    dispatch({
      type: 'SET_DRAFT',
      payload: {
        lat: draft.lat ?? WARD_CENTER.lat,
        lng: draft.lng ?? WARD_CENTER.lng,
        address: raw,
      },
    });
  };

  const matchingStreetSuggestions = useMemo(() => {
    const q = normalizeViText(
      (draft.address ?? '').replace(/^đ\.\s*/i, '').replace(/,\s*p\.\s*trấn biên$/i, '')
    );
    if (!q) return STREETS.slice(0, 6);
    const matches = STREETS.filter((s) => normalizeViText(s.name).includes(q));
    return matches.length > 0 ? matches.slice(0, 6) : STREETS.slice(0, 4);
  }, [draft.address]);

  useEffect(() => {
    if (!isAddressFocused) return;
    const raw = (draft.address ?? '').trim();
    if (
      raw.length < 3 ||
      typeof fetch !== 'function' ||
      (typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom'))
    ) {
      setOsmSuggestions([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          `${raw}, Biên Hòa, Đồng Nai`
        )}&limit=4&accept-language=vi`
      )
        .then((res) => (res.ok ? res.json() : []))
        .then(
          (
            items: Array<{
              lat?: string;
              lon?: string;
              display_name?: string;
              name?: string;
            }>
          ) => {
            if (!active || !Array.isArray(items)) return;
            const parsed = items
              .map((item) => {
                const lat = Number(item.lat);
                const lng = Number(item.lon);
                const firstParts = (item.display_name ?? item.name ?? '')
                  .split(',')
                  .slice(0, 2)
                  .map((p) => p.trim())
                  .filter(Boolean)
                  .join(', ');
                const label = firstParts ? `${firstParts}, P. Trấn Biên` : '';
                return { label, lat, lng };
              })
              .filter((x) => Boolean(x.label) && !isNaN(x.lat) && !isNaN(x.lng));
            setOsmSuggestions(parsed);
          }
        )
        .catch(() => {});
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [draft.address, isAddressFocused]);

  const handleMapTapOnStep2 = (lat: number, lng: number) => {
    setDismissedDuplicate(false);
    setDuplicateIndex(0);
    const street = nearestStreet(lat, lng);
    const fallbackAddr = `Đ. ${street.name}, P. Trấn Biên`;
    dispatch({
      type: 'SET_DRAFT',
      payload: {
        lat,
        lng,
        address: fallbackAddr,
      },
    });
    if (
      typeof fetch === 'function' &&
      !(typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom'))
    ) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { address?: { road?: string; house_number?: string } } | null) => {
          const road = data?.address?.road;
          if (road) {
            const house = data?.address?.house_number;
            const addr = house ? `${house} ${road}, P. Trấn Biên` : `${road}, P. Trấn Biên`;
            dispatch({
              type: 'SET_DRAFT',
              payload: { lat, lng, address: addr },
            });
          }
        })
        .catch(() => {});
    }
  };

  const handleRefreshGps = () => {
    setDismissedDuplicate(false);
    setDuplicateIndex(0);
    Promise.resolve(getCurrentLocation({ timeoutMs: 4000 }))
      .then((coords) => {
        if (!coords) {
          handleSelectQuickStreet(STREETS[0]!);
          return;
        }
        const street = nearestStreet(coords.lat, coords.lng);
        dispatch({
          type: 'SET_DRAFT',
          payload: {
            lat: coords.lat,
            lng: coords.lng,
            address: `Đ. ${street.name}, P. Trấn Biên`,
          },
        });
        showToast('Đã cập nhật vị trí GPS hiện tại', 'success');
      })
      .catch(() => {
        const defaultStreet = STREETS[0]!;
        dispatch({
          type: 'SET_DRAFT',
          payload: {
            lat: WARD_CENTER.lat,
            lng: WARD_CENTER.lng,
            address: `Đ. ${defaultStreet.name}, P. Trấn Biên`,
          },
        });
        showToast('Đã dùng vị trí mặc định tại P. Trấn Biên', 'info');
      });
  };

  const handleAddPhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_PHOTOS - draft.photos.length;
    if (remaining <= 0) {
      showToast('Tối đa 5 ảnh cho mỗi phản ánh', 'warning');
      e.target.value = '';
      return;
    }

    const added: string[] = [];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file, 1280, 0.7);
        added.push(compressed.dataUrl);
      } catch {
        showToast('Không thể đọc một số ảnh đã chọn', 'error');
      }
    }

    if (added.length > 0) {
      const nextPhotos = [...draft.photos, ...added].slice(0, MAX_PHOTOS);
      dispatch({ type: 'SET_DRAFT', payload: { photos: nextPhotos } });
      setActivePhotoIndex(nextPhotos.length - 1);
    }
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const nextPhotos = draft.photos.filter((_, i) => i !== index);
    dispatch({ type: 'SET_DRAFT', payload: { photos: nextPhotos } });
    setActivePhotoIndex((prev) => Math.max(0, Math.min(prev, nextPhotos.length - 1)));
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setDismissedDuplicate(false);
    syncDraftFields(category, description, locationNoteInput, titleInput);
  };

  const handleLocationNoteChange = (val: string) => {
    const trimmed = val.slice(0, 120);
    setLocationNoteInput(trimmed);
    syncDraftFields(selectedCategory, description, trimmed, titleInput);
  };

  const handleTitleChange = (value: string) => {
    const trimmed = value.slice(0, MAX_TITLE_LENGTH);
    setTitleInput(trimmed);
    syncDraftFields(selectedCategory, description, locationNoteInput, trimmed);
  };

  const handleDescriptionChange = (value: string) => {
    const trimmed = value.slice(0, MAX_DESCRIPTION_LENGTH);
    setDescription(trimmed);
    syncDraftFields(selectedCategory, trimmed, locationNoteInput, titleInput);
  };

  const handleToggleSpeech = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setInterimTranscript('');
      return;
    }

    const SpeechCtor = getSpeechRecognitionConstructor();
    if (!SpeechCtor) {
      setVoiceError(
        'Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói. Bạn vui lòng dùng Chrome, Edge hoặc Safari để nhập giọng nói.'
      );
      showToast('Trình duyệt chưa hỗ trợ nhập giọng nói', 'warning');
      return;
    }

    setVoiceError('');
    setInterimTranscript('');

    const recognition = new SpeechCtor();
    recognition.lang = 'vi-VN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const startIdx = event.resultIndex ?? 0;
      let finalChunk = '';
      let interimChunk = '';

      for (let i = startIdx; i < event.results.length; i += 1) {
        const res = event.results[i];
        const piece = res?.[0]?.transcript?.trim() ?? '';
        if (!piece) continue;
        if (res?.isFinal === false) {
          interimChunk = interimChunk ? `${interimChunk} ${piece}` : piece;
        } else {
          finalChunk = finalChunk ? `${finalChunk} ${piece}` : piece;
        }
      }

      setInterimTranscript(interimChunk);

      if (finalChunk) {
        const formattedChunk =
          descriptionRef.current.length === 0
            ? finalChunk.charAt(0).toUpperCase() + finalChunk.slice(1)
            : finalChunk;
        const base = descriptionRef.current.trim();
        const combined = base ? `${base}. ${formattedChunk}` : formattedChunk;
        const nextDesc = combined.slice(0, MAX_DESCRIPTION_LENGTH);
        descriptionRef.current = nextDesc;
        setDescription(nextDesc);

        syncDraftFields(selectedCategory, nextDesc, locationNoteInput, titleInput);
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setInterimTranscript('');
      const errCode = event?.error;
      if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
        setVoiceError(
          'Chưa cấp quyền Micro. Vui lòng bấm biểu tượng ổ khoá trên thanh địa chỉ trình duyệt để cho phép Micro.'
        );
      } else if (errCode === 'no-speech') {
        setVoiceError('Chưa nghe rõ giọng nói. Bạn hãy bấm nút Micro và nói gần thiết bị hơn.');
      } else if (errCode && errCode !== 'aborted') {
        setVoiceError('Không thể thu âm giọng nói lúc này. Bạn có thể thử lại hoặc gõ trực tiếp.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    try {
      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError('Không thể khởi động Micro. Vui lòng kiểm tra thiết bị thu âm.');
    }
  };

  const handleAppendDescPhrase = (phrase: string) => {
    const current = description.trim();
    if (current.toLowerCase().includes(phrase.toLowerCase())) return;
    const nextText = current ? `${current}. ${phrase}` : phrase;
    handleDescriptionChange(nextText);
  };

  const executePhoneSubmit = (verifiedPhone: string) => {
    if (!hasLocation) {
      handleGoToLocationMap();
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      syncDraftFields(selectedCategory, description, locationNoteInput);
      setPendingMode('phone');
      setOfflineError(true);
      return;
    }

    const stateWithPhone = {
      ...state,
      settings: {
        ...state.settings,
        phone: verifiedPhone,
      },
    };

    const { state: nextState, report } = submitReport(
      stateWithPhone,
      {
        category: selectedCategory,
        photos: draft.photos.length > 0 ? draft.photos : [FALLBACK_HERO_PHOTO],
        lat: draft.lat!,
        lng: draft.lng!,
        address: draft.address!,
        locationNote: locationNoteInput.trim() || draft.locationNote,
        title: titleInput.trim() || draft.title?.trim() || undefined,
        description: description.trim() || undefined,
        phone: verifiedPhone,
        anonymous: false,
      },
      settings.demoNow
    );

    setOfflineError(false);
    setPendingMode(null);
    dispatch({ type: 'HYDRATE', payload: nextState });
    navigate('/', {
      state: {
        submittedId: report.id,
        toastMessage: `Gửi phản ánh #${report.id} thành công!`,
      },
    });
  };

  const executeAnonymousSubmit = () => {
    if (!hasLocation) {
      handleGoToLocationMap();
      return;
    }

    if (!canSendAnonymous(settings.anonymousLog, settings.demoNow)) {
      setIsQuotaExceededOpen(true);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      syncDraftFields(selectedCategory, description, locationNoteInput);
      setPendingMode('anonymous');
      setOfflineError(true);
      return;
    }

    const { state: nextState, report } = submitReport(
      state,
      {
        category: selectedCategory,
        photos: draft.photos.length > 0 ? draft.photos : [FALLBACK_HERO_PHOTO],
        lat: draft.lat!,
        lng: draft.lng!,
        address: draft.address!,
        locationNote: locationNoteInput.trim() || draft.locationNote,
        title: titleInput.trim() || draft.title?.trim() || undefined,
        description: description.trim() || undefined,
        anonymous: true,
      },
      settings.demoNow
    );

    setOfflineError(false);
    setPendingMode(null);
    dispatch({ type: 'HYDRATE', payload: nextState });
    setSubmittedAnonymousReport(report);
  };

  const handlePrimarySubmit = () => {
    if (!hasLocation) {
      handleGoToLocationMap();
      return;
    }

    const cleanPhone = phoneInput.replace(/\s+/g, '');

    if (cleanPhone.length > 0) {
      const err = validateVietnamesePhone(cleanPhone);
      if (err) {
        setPhoneError(err);
        return;
      }
      setPhoneError('');

      if (settings.phone === cleanPhone) {
        executePhoneSubmit(cleanPhone);
      } else {
        setIsOtpOpen(true);
      }
      return;
    }

    // Không nhập số điện thoại -> tính vào dạng ẩn danh và gửi thẳng (01d)
    setPhoneError('');
    executeAnonymousSubmit();
  };

  const handleRetryOffline = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      showToast('Thiết bị vẫn đang ngoại tuyến', 'warning');
      return;
    }
    setOfflineError(false);
    if (pendingMode === 'anonymous') {
      executeAnonymousSubmit();
    } else if (pendingMode === 'phone') {
      const cleanPhone = phoneInput.replace(/\s+/g, '');
      if (cleanPhone) {
        executePhoneSubmit(cleanPhone);
      }
    }
  };

  const handleConfirmLocation = () => {
    if (topDuplicate && !dismissedDuplicate) {
      setInspectPhotoIndex(0);
      setIsInspectDuplicateOpen(true);
      return;
    }
    setCurrentStep(3);
  };

  const handleJoinDuplicate = () => {
    if (!topDuplicate) return;
    const cleanPhone = phoneInput.replace(/\s+/g, '') || settings.phone;
    const nextState = followReport(
      state,
      topDuplicate.report.id,
      cleanPhone ? { phone: cleanPhone } : { anonymous: true }
    );
    dispatch({ type: 'HYDRATE', payload: nextState });
    dispatch({ type: 'CLEAR_DRAFT' });
    navigate(`/phan-anh/${topDuplicate.report.id}`);
  };

  const handleSubscribeLater = (verifiedPhone: string) => {
    if (!submittedAnonymousReport) return;
    const nextState = subscribeLater(
      state,
      submittedAnonymousReport.id,
      verifiedPhone,
      settings.demoNow
    );
    const nextWithPhone = {
      ...nextState,
      settings: {
        ...nextState.settings,
        phone: verifiedPhone,
      },
    };
    dispatch({ type: 'HYDRATE', payload: nextWithPhone });
    const updated =
      nextWithPhone.reports.find((r) => r.id === submittedAnonymousReport.id) ??
      submittedAnonymousReport;
    setSubmittedAnonymousReport(updated);
    showToast('Đã đăng ký nhận thông báo tiến độ', 'success');
  };

  const handleUnsubscribeLater = () => {
    if (!submittedAnonymousReport) return;
    const targetPhone = settings.phone;
    if (!targetPhone) return;
    const nextState = unsubscribe(state, submittedAnonymousReport.id, targetPhone);
    dispatch({ type: 'HYDRATE', payload: nextState });
    const updated =
      nextState.reports.find((r) => r.id === submittedAnonymousReport.id) ??
      submittedAnonymousReport;
    setSubmittedAnonymousReport(updated);
    showToast('Đã huỷ nhận tin báo cho phản ánh này', 'info');
  };

  // Màn hình 01d · Thành công Ẩn danh + QR (PDF Page 21)
  if (submittedAnonymousReport) {
    const subscribedPhone =
      submittedAnonymousReport.subscribedLater && settings.phone
        ? submittedAnonymousReport.followers.find((f) => f === settings.phone)
        : undefined;

    return (
      <div className="min-h-screen bg-[var(--color-bg)] pb-12">
        <div className="mx-auto max-w-[460px] md:max-w-2xl space-y-4 px-4 pt-6">
          <h1 className="sr-only" data-testid="screen-title">
            Bước 3: Xác nhận &amp; gửi
          </h1>
          {toast && (
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-[var(--color-text)]">Đã gửi phản ánh</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Ẩn danh
            </span>
          </div>

          <div className="rounded-2xl border border-emerald-300 bg-[#ECFDF5] p-5 dark:border-emerald-800 dark:bg-emerald-950/40">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Đã tiếp nhận phản ánh
            </span>
            <div
              className="mt-2.5 text-[36px] leading-tight font-extrabold tracking-tight text-slate-900 select-all dark:text-white"
              data-testid="submitted-report-id"
            >
              {submittedAnonymousReport.id}
            </div>
            <p className="mt-1 text-base font-extrabold text-[#0084E8] dark:text-[#38BDF8]">
              Mã bí mật để tra cứu:{' '}
              <span className="font-mono tracking-wider">
                {submittedAnonymousReport.secretCode}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TrackingLinkCard
              reportId={submittedAnonymousReport.id}
              secretCode={submittedAnonymousReport.secretCode}
              onCopySuccess={() => showToast('Đã sao chép link theo dõi', 'success')}
            />

            <SubscribeCard
              reportId={submittedAnonymousReport.id}
              currentPhone={subscribedPhone}
              onSubscribe={handleSubscribeLater}
              onUnsubscribe={handleUnsubscribeLater}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/phan-anh/${submittedAnonymousReport.id}?k=${submittedAnonymousReport.secretCode}`
                )
              }
              className="flex min-h-[50px] w-full items-center justify-center rounded-2xl bg-[#0084E8] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#006EC4]"
            >
              Xem chi tiết hồ sơ
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-4 py-2.5 text-sm font-bold text-[#0084E8] transition-colors hover:bg-[#E0F2FE] dark:border-sky-800 dark:bg-sky-950/40 dark:text-[#38BDF8]"
            >
              Về trang Phản ánh
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayPhotos = draft.photos.length > 0 ? draft.photos : [FALLBACK_HERO_PHOTO];
  const heroPhoto = displayPhotos[Math.min(activePhotoIndex, displayPhotos.length - 1)]!;
  const selectedCategoryConfig =
    CATEGORY_CONFIGS.find((c) => c.key === selectedCategory) ?? CATEGORY_CONFIGS[0]!;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <h1 className="sr-only" data-testid="screen-title">
        Bước 3: Xác nhận &amp; gửi
      </h1>

      {/* Shared Hidden File Input for adding photos */}
      <input
        ref={addPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleAddPhotos}
        className="hidden"
        aria-label="Thêm ảnh hiện trường"
      />

      {/* Tablet & PC Top Bar (Visible on md >= 768px) */}
      <header className="hidden md:flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Quay lại"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[var(--color-text)] transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-[var(--color-text)]">
              Hoàn tất &amp; Gửi phản ánh
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Bước {currentStep}/3 · {WIZARD_STEPS[currentStep - 1]?.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-[#E6F3FD] px-3.5 py-1.5 text-xs font-bold text-[#0084E8] dark:bg-sky-950/70 dark:text-[#38BDF8]">
            {displayPhotos.length}/{MAX_PHOTOS} ảnh đính kèm
          </span>
        </div>
      </header>

      {/* Responsive Container tailored separately for:
           - Mobile (< 768px): Full-bleed Photo Hero + Overlapping Rounded Sheet
           - Tablet (md: 768px–1023px): Centered 720px Two-Card Stack (Horizontal Photo Summary Card + Step Wizard Card)
           - PC (lg: >= 1024px): 12-Column Split Studio (Left 5 cols Sticky Photo & Live Summary Card | Right 7 cols Step Wizard Card) */}
      <div className="w-full md:px-6 md:py-6 lg:grid lg:grid-cols-12 lg:gap-7 lg:px-8 lg:py-7 lg:items-start">
        {/* =====================================================================
            LEFT COLUMN (PC lg:col-span-5) / TOP SUMMARY (Tablet md) / HERO (Mobile <md)
           ===================================================================== */}
        <div className="lg:col-span-5 lg:sticky lg:top-6">
          {/* 1A. MOBILE ONLY (< 768px): Photo Hero with Top Controls & Bottom Thumbnail Strip */}
          <div className="relative h-[220px] w-full overflow-hidden bg-zinc-900 md:hidden">
            <img
              src={heroPhoto}
              alt="Ảnh hiện trường sự cố"
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60"
            />

            {/* Mobile Top Bar: [←]   [Xác nhận gửi]   [1/5 ảnh] */}
            <div className="absolute top-3.5 right-4 left-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                aria-label="Quay lại"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <span className="text-base font-bold text-white drop-shadow-sm">Xác nhận gửi</span>

              <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                {displayPhotos.length}/{MAX_PHOTOS} ảnh
              </span>
            </div>

            {/* Mobile Thumbnail Strip: [1] [+] */}
            <div className="absolute right-4 bottom-8 left-4 flex items-center gap-2 overflow-x-auto">
              {displayPhotos.map((photoUrl, idx) => (
                <div key={`m-${idx}-${photoUrl.slice(0, 16)}`} className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    aria-label={`Xem ảnh ${idx + 1}`}
                    className={`relative h-12 w-12 overflow-hidden rounded-xl border-2 transition ${
                      activePhotoIndex === idx
                        ? 'border-[#0084E8] shadow-md'
                        : 'border-white/50 opacity-85'
                    }`}
                  >
                    <img
                      src={photoUrl}
                      alt={`Ảnh thu nhỏ ${idx + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-xs font-extrabold text-white">
                      {idx + 1}
                    </span>
                  </button>
                  {draft.photos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      aria-label={`Xoá ảnh ${idx + 1}`}
                      className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-white hover:bg-red-600"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              ))}

              {draft.photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => navigate('/bao-su-co/anh', { state: { addingPhoto: true } })}
                  aria-label="Thêm ảnh"
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* 1B. TABLET (md) & PC (lg): Dedicated Media & Live Summary Card */}
          <div className="hidden md:block mb-5 lg:mb-0 rounded-3xl border border-slate-200/90 bg-[var(--color-surface)] p-5 shadow-sm dark:border-slate-700">
            {/* Tablet layout: horizontal split (Photo left, Summary right) | PC layout: vertical stack */}
            <div className="md:grid md:grid-cols-12 md:gap-5 lg:block lg:space-y-4">
              {/* Photo Showcase + Thumbnails */}
              <div className="md:col-span-6 lg:w-full space-y-3">
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 dark:border-slate-700">
                  <img
                    src={heroPhoto}
                    alt="Ảnh hiện trường sự cố"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute top-3 right-3 rounded-full bg-black/65 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                    Ảnh #{activePhotoIndex + 1}/{displayPhotos.length}
                  </span>
                </div>

                {/* Thumbnails row */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {displayPhotos.map((photoUrl, idx) => (
                    <div
                      key={`d-${idx}-${photoUrl.slice(0, 16)}`}
                      className="relative flex-shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`relative h-12 w-12 overflow-hidden rounded-xl border-2 transition ${
                          activePhotoIndex === idx
                            ? 'border-[#0084E8] ring-2 ring-[#0084E8]/20'
                            : 'border-slate-200 opacity-80 hover:opacity-100 dark:border-slate-700'
                        }`}
                      >
                        <img
                          src={photoUrl}
                          alt={`Ảnh thu nhỏ ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                      {draft.photos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {draft.photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => navigate('/bao-su-co/anh', { state: { addingPhoto: true } })}
                      aria-label="Thêm ảnh"
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition hover:border-[#0084E8] hover:text-[#0084E8] dark:border-slate-700 dark:bg-slate-800"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Live Draft Summary Panel for Tablet (right half) & PC (bottom half) */}
              <div className="md:col-span-6 lg:w-full flex flex-col justify-between space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Tóm tắt hồ sơ đang tạo
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Bước {currentStep}/3
                    </span>
                  </div>

                  {/* Summary Item 1: Category */}
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-[var(--color-surface)] p-3 text-left transition hover:border-[#0084E8] dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950/70 dark:text-[#38BDF8]">
                        <CategoryIcon category={selectedCategory} className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-[11px] font-medium text-slate-400">
                          1. Loại phản ánh
                        </div>
                        <div className="text-sm font-extrabold text-[var(--color-text)]">
                          {selectedCategoryConfig.label}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#0084E8]">Sửa</span>
                  </button>

                  {/* Summary Item 2: Location */}
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-[var(--color-surface)] p-3 text-left transition hover:border-[#0084E8] dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950/70 dark:text-[#38BDF8]">
                        <MapPin className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-slate-400">
                          2. Vị trí hiện trường
                        </div>
                        <div className="truncate text-sm font-bold text-[var(--color-text)]">
                          {hasLocation ? draft.address : 'Chưa chọn vị trí'}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[#0084E8]">Sửa</span>
                  </button>
                </div>

                <div className="rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] px-3 py-2 text-[11px] text-[#0369A1] dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                  Mọi thông tin đã chọn được tự động lưu nháp khi chuyển giữa các bước.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================================
            RIGHT COLUMN (PC lg:col-span-7) / MAIN WIZARD SHEET (Mobile & Tablet)
           ===================================================================== */}
        <main className="relative z-10 -mt-6 rounded-t-[28px] bg-[var(--color-surface)] px-4 pt-3 pb-10 shadow-sm md:mt-0 md:rounded-3xl md:border md:border-slate-200/90 md:p-6 lg:col-span-7 lg:p-7 dark:md:border-slate-700">
          {/* Mobile Drag Handle */}
          <div
            aria-hidden="true"
            className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 md:hidden dark:bg-slate-700"
          />

          {toast && (
            <div className="mb-4">
              <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            </div>
          )}

          {/* Offline Error Banner */}
          {offlineError && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-amber-950"
            >
              <div className="flex items-start gap-2.5">
                <WifiOff className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold">Chưa gửi được – sẽ thử lại khi có mạng</p>
                  <p className="text-amber-800">Bản nháp của bạn vẫn được giữ nguyên trên máy.</p>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleRetryOffline}>
                Thử lại
              </Button>
            </div>
          )}

          {/* 3-STEP INTERACTIVE STEPPER BAR */}
          <nav aria-label="Các bước xác nhận gửi" className="mb-5">
            <ol className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-1.5 dark:border-slate-800 dark:bg-slate-900">
              {WIZARD_STEPS.map((item) => {
                const isActive = currentStep === item.step;
                const isDone = currentStep > item.step;
                return (
                  <li key={item.step}>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.step === 3 && currentStep === 2) {
                          handleConfirmLocation();
                        } else {
                          setCurrentStep(item.step as WizardStep);
                        }
                      }}
                      aria-current={isActive ? 'step' : undefined}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-extrabold transition-all ${
                        isActive
                          ? 'bg-[#0084E8] text-white shadow-sm'
                          : isDone
                            ? 'bg-[#E6F3FD] text-[#0084E8] hover:bg-[#D0E8FC] dark:bg-sky-950/60 dark:text-[#38BDF8]'
                            : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                          isActive
                            ? 'bg-white text-[#0084E8]'
                            : isDone
                              ? 'bg-[#0084E8] text-white'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {isDone ? <Check className="h-3 w-3 stroke-[3]" /> : item.step}
                      </span>
                      <span className="whitespace-nowrap lg:hidden">{item.shortTitle}</span>
                      <span className="hidden truncate lg:inline">{item.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* =================================================================
              STEP 1: CHỌN LOẠI PHẢN ÁNH
             ================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* AI Recognition Smart Card (Responsive across Phone, Tablet & PC) */}
              <section
                aria-label="Gợi ý phân loại từ AI"
                className="relative overflow-hidden rounded-2xl border border-[#BAE6FD] bg-gradient-to-r from-[#F0F9FF] via-[#F8FCFF] to-[#E6F4FE] p-3.5 sm:p-4 shadow-2xs dark:border-sky-800/80 dark:from-sky-950/60 dark:via-slate-900 dark:to-sky-950/40"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: AI Icon Badge + Recognized Category & Confidence Bar */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0084E8] text-white shadow-[0_6px_16px_rgba(0,132,232,0.3)]">
                      <CategoryIcon category={aiSuggestedCategory} className="h-5 w-5" />
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-amber-400 text-slate-950 shadow-2xs">
                        <Sparkles className="h-2.5 w-2.5 fill-current" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] sm:text-sm font-extrabold text-[#0369A1] dark:text-sky-200">
                          AI nhận diện: {aiSuggestedConfig.label}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-[#0084E8]/12 px-2 py-0.5 text-[11px] font-extrabold text-[#0084E8] dark:bg-sky-400/15 dark:text-[#38BDF8]">
                          92% chính xác
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {selectedCategory === aiSuggestedCategory
                          ? 'Đã tự động chọn phân loại phù hợp bên dưới · Bạn có thể đổi nếu cần'
                          : `Bạn đang chọn "${selectedCategoryConfig.label}" khác với gợi ý ban đầu của AI`}
                      </p>

                      {/* Visual Confidence Meter on Tablet & PC */}
                      <div className="hidden sm:flex items-center gap-2 pt-0.5 max-w-[260px]">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sky-200/70 dark:bg-sky-900">
                          <div className="h-full w-[92%] rounded-full bg-[#0084E8] dark:bg-[#38BDF8]" />
                        </div>
                        <span className="text-[10px] font-bold text-[#0284C7] dark:text-sky-300">
                          Độ tin cậy cao
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action / Status Pill */}
                  <div className="flex items-center justify-end sm:shrink-0">
                    {selectedCategory === aiSuggestedCategory ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Đang áp dụng</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSelectCategory(aiSuggestedCategory)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0084E8] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#006EC4]"
                      >
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        <span>Chọn theo AI</span>
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Loại phản ánh (2×2 on Phone, 4 cols on Tablet, 2×2 large on PC) */}
              <section aria-labelledby="c04-category-heading">
                <h2
                  id="c04-category-heading"
                  className="mb-3 text-base font-extrabold text-[var(--color-text)]"
                >
                  Bước 1: Chọn loại phản ánh
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-3">
                  {CATEGORIES.map((cat) => (
                    <CategoryTile
                      key={cat}
                      category={cat}
                      selected={selectedCategory === cat}
                      onSelect={handleSelectCategory}
                    />
                  ))}
                </div>
              </section>

              {/* Step 1 Footer CTA -> Step 2 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-5 text-base font-extrabold text-white shadow-[0_6px_18px_rgba(0,132,232,0.28)] transition-all hover:bg-[#006EC4] active:scale-[0.99]"
                >
                  <span>Tiếp tục chọn vị trí</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              STEP 2: CHỌN VỊ TRÍ PHẢN ÁNH (Exact match to uploaded Figma Location UI!)
             ================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <section aria-label="Vị trí phản ánh" className="space-y-3.5">
                {/* 1. Lấy vị trí hiện tại (GPS) full-width light blue button */}
                <button
                  type="button"
                  onClick={handleRefreshGps}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-4 py-3 text-sm font-extrabold text-[#0084E8] shadow-2xs transition hover:bg-[#E0F2FE] dark:border-sky-800 dark:bg-sky-950/50 dark:text-[#38BDF8]"
                >
                  <LocateFixed className="h-4 w-4" />
                  <span>Lấy vị trí hiện tại (GPS)</span>
                </button>

                {/* 2. Interactive Map with "Chạm bản đồ để dời ghim" & "© OpenStreetMap contributors" */}
                <div className="relative h-[300px] sm:h-[340px] lg:h-[360px] w-full overflow-hidden rounded-3xl border border-slate-200/90 bg-[#DCEBE6] shadow-2xs dark:border-slate-700">
                  <MapView
                    center={[draft.lat ?? WARD_CENTER.lat, draft.lng ?? WARD_CENTER.lng]}
                    zoom={17}
                    markers={[
                      {
                        id: 'confirm-pin',
                        lat: draft.lat ?? WARD_CENTER.lat,
                        lng: draft.lng ?? WARD_CENTER.lng,
                        category: selectedCategory,
                        status: 'moi',
                        title: draft.address || 'Vị trí phản ánh',
                      },
                    ]}
                    onTap={handleMapTapOnStep2}
                    hideBuiltInLegend={true}
                  />

                  <div className="pointer-events-none absolute top-3.5 left-3.5 z-[500]">
                    <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/95 px-3.5 py-1.5 text-xs font-extrabold text-slate-800 shadow-sm backdrop-blur-xs dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100">
                      Chạm bản đồ để dời ghim
                    </span>
                  </div>

                  <div className="pointer-events-none absolute bottom-2.5 left-3.5 z-[500]">
                    <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 backdrop-blur-2xs dark:bg-slate-900/80 dark:text-slate-300">
                      © OpenStreetMap contributors
                    </span>
                  </div>
                </div>

                {/* 3. Địa chỉ (Trực tiếp chỉnh sửa + Tích hợp tìm kiếm & gợi ý đồng bộ bản đồ) */}
                <div className="relative">
                  <div
                    className={`rounded-2xl border bg-[#F8FAFC] px-4 py-3 transition-colors dark:bg-slate-800/60 ${
                      isAddressFocused
                        ? 'border-[#0084E8] bg-[var(--color-surface)] ring-2 ring-[#0084E8]/20'
                        : 'border-slate-200/90 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="c04-address-input"
                        className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                      >
                        Địa chỉ
                      </label>
                      <span className="text-[11px] font-medium text-slate-400">
                        Nhập tìm hoặc chạm bản đồ
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                      <Search className="h-4 w-4 shrink-0 text-[#0084E8] dark:text-[#38BDF8]" />
                      <input
                        id="c04-address-input"
                        type="text"
                        value={draft.address ?? ''}
                        onFocus={() => setIsAddressFocused(true)}
                        onBlur={() => {
                          window.setTimeout(() => setIsAddressFocused(false), 180);
                        }}
                        onChange={(e) => handleAddressInputChange(e.target.value)}
                        placeholder="Nhập số nhà, tên đường hoặc chạm trên bản đồ..."
                        aria-label="Địa chỉ"
                        className="w-full bg-transparent text-[15px] font-extrabold text-[var(--color-text)] placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
                      />
                      {draft.address && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleAddressInputChange('')}
                          aria-label="Xoá địa chỉ để nhập lại"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-500 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Integrated Search & Street Autocomplete Dropdown */}
                  {isAddressFocused && (
                    <div
                      role="listbox"
                      aria-label="Gợi ý địa chỉ"
                      className="absolute inset-x-0 top-full z-[600] mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-slate-200/90 bg-[var(--color-surface)] p-1.5 shadow-xl dark:border-slate-700"
                    >
                      {osmSuggestions.length > 0 && (
                        <div className="mb-1">
                          <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#0084E8]">
                            Kết quả tìm kiếm bản đồ
                          </div>
                          {osmSuggestions.map((item, idx) => (
                            <button
                              key={`osm-${idx}-${item.lat}`}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setDismissedDuplicate(false);
                                setDuplicateIndex(0);
                                setIsAddressFocused(false);
                                dispatch({
                                  type: 'SET_DRAFT',
                                  payload: {
                                    lat: item.lat,
                                    lng: item.lng,
                                    address: item.label,
                                  },
                                });
                              }}
                              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-[var(--color-text)] transition hover:bg-[#F0F9FF] dark:hover:bg-slate-800"
                            >
                              <MapPin className="h-4 w-4 shrink-0 text-[#0084E8]" />
                              <span className="truncate">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div>
                        <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Tuyến đường tại P. Trấn Biên
                        </div>
                        {matchingStreetSuggestions.map((street) => (
                          <button
                            key={street.name}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectQuickStreet(street)}
                            className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-[var(--color-text)] transition hover:bg-[#F0F9FF] dark:hover:bg-slate-800"
                          >
                            <span className="flex items-center gap-2.5 truncate">
                              <MapPin className="h-4 w-4 shrink-0 text-[#0084E8]" />
                              <span className="truncate">Đ. {street.name}, P. Trấn Biên</span>
                            </span>
                            <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                              Dời ghim
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Location Note */}
                <div>
                  <input
                    id="c04-location-note"
                    type="text"
                    maxLength={120}
                    value={locationNoteInput}
                    onChange={(e) => handleLocationNoteChange(e.target.value)}
                    placeholder="Ghi chú điểm mốc dễ tìm (tuỳ chọn, VD: đối diện số nhà 45)..."
                    className="w-full rounded-2xl border border-slate-200/90 bg-[#F8FAFC] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-slate-400 focus:border-[#0084E8] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[#0084E8]/20 dark:border-slate-700 dark:bg-slate-800/50"
                  />
                </div>
              </section>

              {/* Step 2 Primary CTA: "Xác nhận vị trí" -> Kiểm tra ngầm phản ánh tương tự; nếu có sẽ bật thông báo đối chiếu ngay trước mặt */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleConfirmLocation}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-5 text-base font-extrabold text-white shadow-[0_6px_18px_rgba(0,132,232,0.28)] transition-all hover:bg-[#006EC4] active:scale-[0.99]"
                >
                  <span>Xác nhận vị trí</span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              STEP 3: MÔ TẢ & LIÊN HỆ + GỬI PHẢN ÁNH
             ================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Mobile Structured Summary Card (2 clean rows, never wraps "Đổi" awkwardly!) */}
              <div className="divide-y divide-slate-200/70 rounded-2xl border border-slate-200/90 bg-[#F8FAFC] px-3.5 py-1 md:hidden dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between gap-2 py-2.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-[var(--color-text)]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950/70 dark:text-[#38BDF8]">
                      <CategoryIcon category={selectedCategory} className="h-4 w-4" />
                    </span>
                    <span>{selectedCategoryConfig.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="shrink-0 rounded-full bg-[#E6F3FD] px-2.5 py-1 text-[11px] font-bold text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]"
                  >
                    Đổi loại
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 py-2.5 text-xs">
                  <div className="flex min-w-0 items-center gap-2 text-[var(--color-text)]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950/70 dark:text-[#38BDF8]">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span className="truncate font-semibold">
                      {draft.address || 'Đ. Cách Mạng Tháng Tám, P. Trấn Biên'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="shrink-0 rounded-full bg-[#E6F3FD] px-2.5 py-1 text-[11px] font-bold text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]"
                  >
                    Đổi vị trí
                  </button>
                </div>
              </div>

              <section aria-label="Mô tả và liên hệ" className="space-y-4">
                {/* Section Header */}
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[var(--color-text)]">
                    Mô tả &amp; Liên hệ
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Giúp Cán bộ, Tình nguyện viên và Cộng đồng nắm rõ hiện trạng nhanh nhất
                  </p>
                </div>

                {/* CARD 1: Nội dung phản ánh (Tiêu đề + Mô tả hiện trạng) */}
                <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-4 sm:p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800/50">
                  {/* Block Header */}
                  <div className="flex items-center gap-2.5 border-b border-slate-200/70 pb-3 dark:border-slate-700/70">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-extrabold text-[var(--color-text)]">
                      Nội dung sự cố
                    </h3>
                  </div>

                  {/* Field 1A: Tiêu đề phản ánh */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        htmlFor="c04-title"
                        className="text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300"
                      >
                        Tiêu đề phản ánh
                      </label>
                      <div className="flex items-center gap-2">
                        {titleInput.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleTitleChange('')}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            Xoá
                          </button>
                        )}
                        <span className="text-[11px] font-semibold text-slate-400">
                          {titleInput.length}/{MAX_TITLE_LENGTH}
                        </span>
                      </div>
                    </div>

                    <input
                      id="c04-title"
                      type="text"
                      maxLength={MAX_TITLE_LENGTH}
                      value={titleInput}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder={`VD: ${CATEGORY_TITLE_SUGGESTIONS[selectedCategory]?.[0] ?? 'Tóm tắt ngắn gọn sự cố'}...`}
                      aria-label="Tiêu đề phản ánh"
                      className="w-full rounded-xl border border-slate-200/90 bg-[var(--color-surface)] px-3.5 py-2.5 text-sm font-bold text-[var(--color-text)] placeholder:font-normal placeholder:text-slate-400 shadow-2xs transition-colors focus:border-[#0084E8] focus:outline-none focus:ring-2 focus:ring-[#0084E8]/20 dark:border-slate-700"
                    />

                    {/* Quick 1-tap title suggestions per category */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 mr-0.5">
                        Gợi ý:
                      </span>
                      {(CATEGORY_TITLE_SUGGESTIONS[selectedCategory] ?? []).map((suggestion) => {
                        const isSelectedChip = titleInput.trim() === suggestion;
                        return (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => handleTitleChange(suggestion)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                              isSelectedChip
                                ? 'border-[#0084E8] bg-[#E6F3FD] text-[#0084E8] shadow-2xs dark:border-sky-500 dark:bg-sky-950 dark:text-[#38BDF8]'
                                : 'border-slate-200/90 bg-white text-slate-600 hover:border-[#0084E8]/50 hover:text-[#0084E8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                            }`}
                          >
                            {isSelectedChip ? '✓ ' : '+ '}
                            {suggestion}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Field 1B: Mô tả chi tiết hiện trạng (kèm Nhập bằng giọng nói ngay tại đây) */}
                  <div className="border-t border-slate-200/70 pt-3.5 dark:border-slate-700/70">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor="c04-description"
                        className="text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300"
                      >
                        Mô tả chi tiết hiện trạng
                      </label>

                      <div className="flex items-center gap-2.5">
                        {description.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleDescriptionChange('')}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            Xoá
                          </button>
                        )}
                        <span className="text-[11px] font-semibold text-slate-400">
                          {description.length}/{MAX_DESCRIPTION_LENGTH}
                        </span>

                        {/* Voice Dictation Button belonging directly to Description */}
                        <button
                          type="button"
                          onClick={handleToggleSpeech}
                          aria-label={
                            isListening ? 'Dừng nhập giọng nói' : 'Nhập mô tả bằng giọng nói'
                          }
                          aria-pressed={isListening}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-all ${
                            isListening
                              ? 'animate-pulse bg-red-600 text-white shadow-xs shadow-red-500/30 hover:bg-red-700'
                              : 'border border-[#BAE6FD] bg-[#F0F9FF] text-[#0084E8] hover:bg-[#E0F2FE] dark:border-sky-800 dark:bg-sky-950/70 dark:text-[#38BDF8]'
                          }`}
                        >
                          {isListening ? (
                            <>
                              <MicOff className="h-3 w-3" />
                              <span>Dừng thu âm</span>
                            </>
                          ) : (
                            <>
                              <Mic className="h-3 w-3" />
                              <span>Nhập giọng nói</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Live Voice Recording Banner placed directly inside Description section */}
                    {isListening && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="mb-2.5 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 via-orange-50/70 to-red-50 p-3 dark:border-red-900/70 dark:from-red-950/50 dark:via-slate-900 dark:to-red-950/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 items-end gap-0.5 px-1" aria-hidden="true">
                              <span className="h-2.5 w-1 animate-bounce rounded-full bg-red-500" />
                              <span className="h-4 w-1 animate-pulse rounded-full bg-red-600" />
                              <span className="h-3 w-1 animate-bounce rounded-full bg-red-500" />
                              <span className="h-5 w-1 animate-pulse rounded-full bg-red-600" />
                              <span className="h-2 w-1 animate-bounce rounded-full bg-red-500" />
                            </span>
                            <span className="text-xs font-extrabold text-red-700 dark:text-red-300">
                              Đang nghe mô tả hiện trạng...
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleSpeech}
                            className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-700"
                          >
                            Hoàn tất
                          </button>
                        </div>
                        <p className="mt-1.5 text-xs font-medium italic text-slate-700 dark:text-slate-200">
                          {interimTranscript
                            ? `“${interimTranscript}...”`
                            : 'Hãy nói chi tiết hiện trạng sự cố để hệ thống chuyển thành văn bản vào ô mô tả bên dưới...'}
                        </p>
                      </div>
                    )}

                    {/* Voice Error / Permission Guidance Banner placed directly inside Description section */}
                    {voiceError && !isListening && (
                      <div
                        role="alert"
                        className="mb-2.5 flex items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <span>{voiceError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVoiceError('')}
                          aria-label="Đóng thông báo giọng nói"
                          className="shrink-0 rounded-md p-0.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="relative">
                      <textarea
                        id="c04-description"
                        rows={3}
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        value={description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        placeholder="Mô tả chi tiết hiện trạng sự cố hoặc bấm 'Nhập giọng nói' để đọc..."
                        aria-label="Mô tả thêm"
                        className={`w-full resize-none rounded-xl border bg-[var(--color-surface)] p-3.5 text-sm leading-relaxed text-[var(--color-text)] placeholder:text-slate-400 shadow-2xs transition-colors focus:outline-none focus:ring-2 ${
                          isListening
                            ? 'border-red-400 ring-2 ring-red-400/20'
                            : 'border-slate-200/90 focus:border-[#0084E8] focus:ring-[#0084E8]/20 dark:border-slate-700'
                        }`}
                      />
                    </div>

                    {/* Quick 1-tap description phrase chips */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 mr-0.5">
                        Gợi ý:
                      </span>
                      {(CATEGORY_DESC_PHRASES[selectedCategory] ?? []).map((phrase) => {
                        const alreadyAdded = description
                          .toLowerCase()
                          .includes(phrase.toLowerCase());
                        return (
                          <button
                            key={phrase}
                            type="button"
                            onClick={() => handleAppendDescPhrase(phrase)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                              alreadyAdded
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'border-slate-200/90 bg-white text-slate-600 hover:border-[#0084E8]/50 hover:text-[#0084E8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                            }`}
                          >
                            {alreadyAdded ? '✓ ' : '+ '}
                            {phrase}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CARD 2: Liên hệ nhận tin & Quyền riêng tư (Responsive 12-col layout on Tablet/PC) */}
                <div className="space-y-3.5 rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-4 sm:p-5 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800/50">
                  {/* Card 2 Header + Mode Switcher Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/70 pb-3 dark:border-slate-700/70">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          phoneInput.trim().length > 0
                            ? 'bg-[#E6F3FD] text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]'
                            : 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                        }`}
                      >
                        {phoneInput.trim().length > 0 ? (
                          <Phone className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-[var(--color-text)]">
                        Liên hệ &amp; Quyền riêng tư
                      </h3>
                    </div>

                    {/* Visual Mode Selector Pills */}
                    <div className="inline-flex rounded-xl border border-slate-200/90 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneInput('');
                          setPhoneError('');
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-all ${
                          phoneInput.trim().length === 0
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <Lock className="h-3 w-3" />
                        <span>Ẩn danh</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!phoneInput.trim() && settings.phone) {
                            setPhoneInput(settings.phone);
                          }
                          phoneInputElRef.current?.focus();
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition-all ${
                          phoneInput.trim().length > 0
                            ? 'bg-[#0084E8] text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                        }`}
                      >
                        <Phone className="h-3 w-3" />
                        <span>Nhận SMS</span>
                      </button>
                    </div>
                  </div>

                  {/* Responsive 2-column split on Tablet/PC: Phone Input (Left) + Privacy Guarantee (Right) */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
                    {/* Left: Phone Input */}
                    <div className="sm:col-span-7 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <label
                            htmlFor="c04-phone-input"
                            className="text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:text-slate-300"
                          >
                            Số điện thoại nhận tin
                          </label>
                          {settings.phone && phoneInput.replace(/\s+/g, '') !== settings.phone && (
                            <button
                              type="button"
                              onClick={() => {
                                setPhoneInput(settings.phone ?? '');
                                setPhoneError('');
                              }}
                              className="text-[11px] font-extrabold text-[#0084E8] hover:underline dark:text-[#38BDF8]"
                            >
                              Dùng SĐT đã lưu ({settings.phone})
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <Phone className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <input
                            ref={phoneInputElRef}
                            id="c04-phone-input"
                            type="tel"
                            inputMode="numeric"
                            placeholder="Để trống nếu gửi ẩn danh (VD: 0909 000 068)"
                            aria-label="Số điện thoại nhận tin (VD: 0909 000 068)"
                            value={phoneInput}
                            onChange={(e) => {
                              setPhoneInput(e.target.value);
                              if (phoneError) setPhoneError('');
                            }}
                            className={`w-full rounded-xl border bg-[var(--color-surface)] py-3 pr-9 pl-10 text-sm font-semibold text-[var(--color-text)] placeholder:font-normal placeholder:text-slate-400 shadow-2xs transition-colors focus:outline-none focus:ring-2 ${
                              phoneError
                                ? 'border-red-500 focus:ring-red-500/20'
                                : 'border-slate-200/90 focus:border-[#0084E8] focus:ring-[#0084E8]/20 dark:border-slate-700'
                            }`}
                          />
                          {phoneInput.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPhoneInput('');
                                setPhoneError('');
                              }}
                              aria-label="Xoá số điện thoại để gửi ẩn danh"
                              className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {phoneError && (
                          <p className="mt-1.5 px-1 text-xs font-semibold text-red-600">
                            {phoneError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Privacy & Anonymous Explanation Box */}
                    <div className="sm:col-span-5 flex items-center rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] p-3 text-xs leading-relaxed text-slate-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-slate-200">
                      <div className="flex items-start gap-2.5">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0084E8] dark:text-[#38BDF8]" />
                        <div>
                          {phoneInput.trim().length > 0 ? (
                            <span>
                              SĐT <strong>được bảo mật tuyệt đối</strong>, chỉ dùng gửi SMS báo tiến
                              độ xử lý, không hiển thị công khai.
                            </span>
                          ) : (
                            <span>
                              Để trống SĐT sẽ gửi ở chế độ <strong>Ẩn danh</strong> và cấp ngay{' '}
                              <strong>Mã bí mật + QR</strong> để bạn tự tra cứu.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Step 3 Footer: Full-width "Gửi phản ánh" matching Figma Image 5 + subtle back link */}
              <div className="space-y-2.5 pt-1">
                {hasLocation ? (
                  <button
                    type="button"
                    onClick={handlePrimarySubmit}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-5 text-base font-extrabold text-white shadow-[0_6px_18px_rgba(0,132,232,0.28)] transition-all hover:bg-[#006EC4] active:scale-[0.99]"
                  >
                    <Send className="h-4 w-4" />
                    <span>Gửi phản ánh</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[#E2E8F0] px-4 text-base font-bold text-[#64748B] transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Chọn vị trí để gửi
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Kiểm tra & Đối chiếu phản ánh tương tự (in-place, không làm mất bản nháp, không lộ mã TB-xxxx) */}
      {isInspectDuplicateOpen && topDuplicate && (
        <div
          className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Đối chiếu phản ánh tương tự"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsInspectDuplicateOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg sm:max-w-[580px] md:max-w-[640px] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200/80 bg-[var(--color-surface)] shadow-2xl dark:border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-amber-200/70 bg-gradient-to-r from-[#FFFDF5] via-[#FFFBEB] to-[#FEF3C7]/40 px-4 py-3.5 sm:px-5 dark:border-amber-800/60 dark:from-amber-950/50 dark:via-slate-900 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/25">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-amber-950 dark:text-amber-100">
                      Phát hiện phản ánh tương tự
                    </h3>
                    {duplicateMatches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setInspectPhotoIndex(0);
                          setDuplicateIndex((prev) => (prev + 1) % duplicateMatches.length);
                        }}
                        className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 hover:bg-amber-50 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-200"
                      >
                        Xem tin khác ({duplicateIndex + 1}/{duplicateMatches.length})
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-amber-800/90 dark:text-amber-200/80">
                    Đã có{' '}
                    <strong className="font-extrabold">
                      {followerCount(topDuplicate.report)} người
                    </strong>{' '}
                    báo sự cố cùng loại cách vị trí bạn chọn khoảng{' '}
                    <strong className="font-extrabold">
                      {formatDistance(topDuplicate.distanceMeters)}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInspectDuplicateOpen(false)}
                aria-label="Đóng cửa sổ đối chiếu"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-500 hover:bg-white hover:text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="space-y-4 overflow-y-auto p-4 sm:p-5">
              {/* Side-by-side Photo Comparison: Ảnh đã được báo vs Ảnh của bạn */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {/* Col 1: Existing Report Photo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      Sự cố đã được báo
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                      ~{formatDistance(topDuplicate.distanceMeters)}
                    </span>
                  </div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-amber-300/90 bg-slate-100 dark:border-amber-700 dark:bg-slate-800">
                    <img
                      src={
                        topDuplicate.report.photos[
                          Math.min(inspectPhotoIndex, topDuplicate.report.photos.length - 1)
                        ] || FALLBACK_HERO_PHOTO
                      }
                      alt="Ảnh hiện trường sự cố đã được báo"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {topDuplicate.report.photos.length > 1 && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {topDuplicate.report.photos.map((photoUrl, idx) => (
                        <button
                          key={`dup-photo-${idx}`}
                          type="button"
                          onClick={() => setInspectPhotoIndex(idx)}
                          className={`h-9 w-9 overflow-hidden rounded-lg border-2 transition-all ${
                            idx === inspectPhotoIndex
                              ? 'border-amber-500 ring-1 ring-amber-500'
                              : 'border-slate-200 opacity-70 hover:opacity-100 dark:border-slate-700'
                          }`}
                        >
                          <img
                            src={photoUrl}
                            alt={`Ảnh ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Col 2: Current Citizen's Draft Photo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#0084E8] dark:text-[#38BDF8]">
                      Ảnh bạn vừa chụp
                    </span>
                    <span className="rounded-full bg-[#E6F3FD] px-2 py-0.5 text-[10px] font-bold text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]">
                      Của bạn
                    </span>
                  </div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border-2 border-[#0084E8]/70 bg-slate-100 dark:border-sky-600 dark:bg-slate-800">
                    <img
                      src={heroPhoto}
                      alt="Ảnh hiện trường bạn vừa chụp"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Detailed Info Card of the Existing Report */}
              <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-3.5 sm:p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#E6F3FD] px-2.5 py-1 text-xs font-extrabold text-[#0084E8] dark:bg-sky-950 dark:text-[#38BDF8]">
                      <CategoryIcon
                        category={topDuplicate.report.category}
                        className="h-3.5 w-3.5"
                      />
                      {CATEGORY_CONFIGS.find((c) => c.key === topDuplicate.report.category)
                        ?.label ?? selectedCategoryConfig.label}
                    </span>
                    <span className="inline-flex items-center rounded-lg bg-emerald-100/90 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                      {STATUS_CONFIGS[topDuplicate.report.status]?.publicLabel ?? 'Đã tiếp nhận'}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Users className="h-3.5 w-3.5 text-amber-600" />
                    {followerCount(
                      topDuplicate.report
                    )} người đã báo
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Nội dung sự cố đã ghi nhận
                  </div>
                  <p className="mt-1 text-xs sm:text-sm font-extrabold leading-relaxed text-[var(--color-text)]">
                    {topDuplicate.report.title ||
                      topDuplicate.report.description ||
                      `Sự cố ${selectedCategoryConfig.label.toLowerCase()} tại khu vực này`}
                  </p>
                  {topDuplicate.report.title && topDuplicate.report.description && (
                    <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                      {topDuplicate.report.description}
                    </p>
                  )}
                </div>

                {/* Location & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-slate-200/80 pt-2.5 dark:border-slate-700/80">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Vị trí ghi nhận
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-[var(--color-text)]">
                      {topDuplicate.report.address}
                    </p>
                    {topDuplicate.report.locationNote && (
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Điểm mốc: {topDuplicate.report.locationNote}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Thời gian báo cáo
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-[var(--color-text)]">
                      {formatRelativeTime(topDuplicate.report.createdAt, settings.demoNow)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {formatDateTime(topDuplicate.report.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions: Proportioned single-line buttons on PC/Tablet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-900/60">
              <button
                type="button"
                onClick={() => {
                  setIsInspectDuplicateOpen(false);
                  handleJoinDuplicate();
                }}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0084E8] px-5 text-[13px] sm:text-sm font-extrabold whitespace-nowrap text-white shadow-[0_6px_16px_rgba(0,132,232,0.25)] transition-all hover:bg-[#006EC4] active:scale-[0.99]"
              >
                <ThumbsUp className="h-4 w-4 shrink-0" />
                <span>Đúng chỗ này – tôi cũng gặp</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsInspectDuplicateOpen(false);
                  setDismissedDuplicate(true);
                  setCurrentStep(3);
                }}
                className="flex h-12 items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-5 text-[13px] sm:text-sm font-bold whitespace-nowrap text-slate-700 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <span>Không phải – gửi phản ánh mới</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BottomSheet xác thực OTP khi có nhập SĐT */}
      {isOtpOpen && (
        <PhoneOtpSheet
          isOpen={isOtpOpen}
          onClose={() => setIsOtpOpen(false)}
          initialPhone={phoneInput.replace(/\s+/g, '')}
          onVerified={(verifiedPhone) => {
            setPhoneInput(verifiedPhone);
            setIsOtpOpen(false);
            executePhoneSubmit(verifiedPhone);
          }}
        />
      )}

      {/* BottomSheet vượt hạn mức 5 hồ sơ ẩn danh/ngày */}
      <BottomSheet
        isOpen={isQuotaExceededOpen}
        onClose={() => setIsQuotaExceededOpen(false)}
        title="Đã đạt giới hạn hôm nay"
        footer={
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={() => {
              setIsQuotaExceededOpen(false);
              setIsOtpOpen(true);
            }}
          >
            Để lại số điện thoại
          </Button>
        }
      >
        <div className="flex items-start gap-3 py-2 text-sm leading-relaxed text-[var(--color-text)]">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <p>Hôm nay bạn đã gửi 5 phản ánh ẩn danh. Vui lòng để lại số điện thoại để gửi tiếp.</p>
        </div>
      </BottomSheet>
    </div>
  );
}
