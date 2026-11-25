import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppStoreProvider, getInitialState } from '@/store/AppStore';
import { WelcomeScreen, WELCOMED_STORAGE_KEY } from '@/screens/citizen/WelcomeScreen';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-font-scale');
  });

  it('hiển thị màn hình chào trước, sau khi bấm Bắt đầu mới hỏi chọn 4 mức cỡ chữ (mặc định Thường) và vào app', () => {
    let completed = false;
    render(
      <AppStoreProvider initialState={getInitialState()}>
        <WelcomeScreen
          onComplete={() => {
            completed = true;
          }}
        />
      </AppStoreProvider>
    );

    // Bước 1: Chỉ hiển thị màn hình chào, chưa hỏi cỡ chữ
    expect(screen.getByText('Trấn Biên Kết Nối')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Chọn kích cỡ chữ' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));

    // Bước 2: Sau khi bấm Bắt đầu mới hiển thị chọn 4 mức cỡ chữ
    expect(screen.getByRole('radio', { name: /Thường/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Nhỏ/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Lớn/ })).toBeInTheDocument();

    const xlargeBtn = screen.getByRole('radio', { name: /Siêu lớn/ });
    fireEvent.click(xlargeBtn);
    expect(xlargeBtn).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.getAttribute('data-font-scale')).toBe('xlarge');

    fireEvent.click(screen.getByRole('button', { name: /Hoàn tất/ }));

    expect(completed).toBe(true);
    expect(window.localStorage.getItem(WELCOMED_STORAGE_KEY)).toBe('1');
  });
});
