/**
 * Chức năng chia sẻ mạng xã hội (Facebook, TikTok, Web Share API)
 */
import { $ } from '../../core/dom.js';
import { toast } from '../../core/toast.js';
import { track } from '../../analytics/tracker.js';
import { ugc } from './letter.state.js';
import { captionsFor, cardBlob, downloadCardImage } from './canvas-exporter.js';
import { getPass } from '../passport/passport.state.js';

export const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export function openAppWithFallback(appScheme, webFallbackUrl) {
  if (!isMobileDevice) {
    window.open(webFallbackUrl, '_blank', 'noopener');
    return;
  }
  const start = Date.now();
  let hidden = false;
  const onVisibility = () => {
    if (document.hidden) hidden = true;
  };
  document.addEventListener('visibilitychange', onVisibility, { once: true });

  window.location.href = appScheme;

  setTimeout(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    if (!hidden && Date.now() - start < 2600) {
      window.location.href = webFallbackUrl;
    }
  }, 1800);
}

export async function share(network) {
  track('share_click', { network });
  const text = captionsFor()[ugc.caption];

  await downloadCardImage();

  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {}

  await new Promise((r) => setTimeout(r, 400));

  if (network === 'facebook') {
    const fbAppScheme = 'fb://feed';
    const fbWebUrl = 'https://www.facebook.com/';
    if (isMobileDevice) {
      toast(
        'Đã lưu ảnh & copy caption! Đang mở ứng dụng Facebook để bạn đăng bài...',
        'ok',
        'facebook-logo'
      );
      openAppWithFallback(fbAppScheme, fbWebUrl);
    } else {
      window.open(
        'https://www.facebook.com/sharer/sharer.php?u=' +
          encodeURIComponent(location.origin + location.pathname),
        '_blank',
        'noopener,width=640,height=560'
      );
      toast(
        'Đã tải ảnh về máy và copy caption! Hãy đính kèm ảnh và đăng lên Facebook nhé.',
        'ok',
        'facebook-logo'
      );
    }
  } else if (network === 'tiktok') {
    const ttAppScheme = 'tiktok://';
    const ttWebUrl = 'https://www.tiktok.com/upload';
    if (isMobileDevice) {
      toast(
        'Đã lưu ảnh & copy caption! Đang mở ứng dụng TikTok để bạn chọn ảnh đăng...',
        'ok',
        'tiktok-logo'
      );
      openAppWithFallback(ttAppScheme, ttWebUrl);
    } else {
      window.open(ttWebUrl, '_blank', 'noopener');
      toast(
        'Đã tải ảnh về máy và copy caption! Hãy đăng ảnh và dán caption lên TikTok nhé.',
        'ok',
        'tiktok-logo'
      );
    }
  }
}

export async function shareNative() {
  track('share_click', { network: 'native' });
  const text = captionsFor()[ugc.caption];
  const blob = await cardBlob();
  if (!blob) return;
  const pass = getPass();
  const file = new File([blob], `ChuyenNhaTao-${(pass && pass.nickname) || 'dem23'}.png`, {
    type: 'image/png'
  });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: 'Chuyện Nhà Đêm 23' });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  await downloadCardImage();
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {}
  toast('Đã lưu ảnh vào máy và sao chép sẵn caption kèm hashtag!', 'ok', 'share-network');
}

export function initShareButtons() {
  $('#btn-share-fb')?.addEventListener('click', () => share('facebook'));
  $('#btn-share-tt')?.addEventListener('click', () => share('tiktok'));
  $('#btn-share-more')?.addEventListener('click', shareNative);
}
