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

  it('hiển thị 4 mức cỡ chữ (mặc định Thường), cho phép chọn Siêu lớn và bấm Bắt đầu vào thẳng app', () => {
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

    expect(screen.getByText('Trấn Biên Kết Nối')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Thường/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Nhỏ/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Lớn/ })).toBeInTheDocument();

    const xlargeBtn = screen.getByRole('radio', { name: /Siêu lớn/ });
    fireEvent.click(xlargeBtn);
    expect(xlargeBtn).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.getAttribute('data-font-scale')).toBe('xlarge');

    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));

    expect(completed).toBe(true);
    expect(window.localStorage.getItem(WELCOMED_STORAGE_KEY)).toBe('1');
  });
});
