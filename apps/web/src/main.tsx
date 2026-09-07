import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App } from './app/App';
import { store } from './app/store';
import './shared/styles/global.scss';

/**
 * StrictMode ở bản dev dựng rồi huỷ editor ngay, khiến Monaco huỷ tác vụ nội bộ và ném
 * `Canceled` — một promise bị huỷ theo đúng thiết kế, không phải lỗi. Nó nổi lên console
 * dưới dạng "Uncaught (in promise)" kèm 40 dòng stack, chôn mất lỗi thật.
 *
 * Chặn ĐÚNG loại đó, và chỉ ở bản dev. Mọi rejection khác vẫn hiện nguyên.
 */
if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason;
    const name = reason instanceof Error ? reason.name : undefined;
    if (name === 'Canceled' || name === 'CodeExpectedError') event.preventDefault();
  });
}

const host = document.getElementById('root');
if (host === null) throw new Error('Không tìm thấy #root');

createRoot(host).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
