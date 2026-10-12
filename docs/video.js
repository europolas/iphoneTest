import en from './video-locales/en.js';
import lt from './video-locales/lt.js';

'use strict';

/**
 * Observe the native MP4 player without replacing its iPhone controls.
 * Keep the last meaningful event visible while timeupdate refreshes position.
 * Rendering uses textContent; no video data or playback history is persisted.
 */
(() => {
  const video = document.getElementById('demo-video');
  const status = document.getElementById('video-status');
  if (!video || !status) return;
  const card = video.closest('[data-video-language]');
  const messages = card?.dataset.videoLanguage === 'lt' ? lt : en;
  const t = key => messages[key] ?? en[key] ?? key;
  for (const [id, key] of [['video-title', 'videoTitle'], ['video-help', 'videoHelp'], ['video-fallback', 'videoFallback']]) document.getElementById(id).textContent = t(key);
  if (card) card.lang = messages === lt ? 'lt' : 'en';
  let lastEvent = t('videoReady');
  let hasPlaybackAction = false;
  const recentEvents = [];
  const backgroundEvents = new Set(['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'suspend', 'durationchange']);
  const format = seconds => Number.isFinite(seconds)
    ? Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0')
    : '--:--';
  const errors = {
    1: t('videoAborted'),
    2: t('videoNetworkError'),
    3: t('videoDecodeError'),
    4: t('videoFormatError')
  };
  function render() {
    const state = video.error ? 'error' : video.ended ? 'ended' : video.seeking ? 'seeking' : video.paused ? 'paused' : 'playing';
    status.textContent = t('videoEvent') + ': ' + lastEvent + ' · ' + t('videoState') + ': ' + t('video' + state[0].toUpperCase() + state.slice(1))
      + ' · ' + t('videoPosition') + ': ' + format(video.currentTime) + ' / ' + format(video.duration)
      + ' · ' + t('videoSpeed') + ': ' + video.playbackRate + '×'
      + ' · ' + t('videoVolume') + ': ' + (video.muted ? t('videoMuted') : Math.round(video.volume * 100) + '%')
      + (video.error ? ' · ' + (errors[video.error.code] || t('videoFailed')) : '')
      + (recentEvents.length ? '\n' + t('videoRecentEvents') + ': ' + recentEvents.join(' → ') : '');
  }
  for (const event of ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
    'play', 'playing', 'pause', 'seeking', 'seeked', 'waiting', 'stalled', 'suspend',
    'ended', 'error', 'abort', 'emptied', 'ratechange', 'volumechange',
    'durationchange', 'enterpictureinpicture', 'leavepictureinpicture',
    'webkitbeginfullscreen', 'webkitendfullscreen']) {
    video.addEventListener(event, () => {
      recentEvents.push(event);
      if (recentEvents.length > 8) recentEvents.shift();
      // Loading/readiness events often follow seeked: retain the user action and
      // still expose those background events in the bounded recent-event list.
      if (!hasPlaybackAction || !backgroundEvents.has(event)) lastEvent = event;
      if (['play', 'playing', 'pause', 'seeking', 'seeked', 'ended'].includes(event)) hasPlaybackAction = true;
      render();
    });
  }
  // Do not hide play/pause/seek events behind frequent timeupdate notifications.
  video.addEventListener('timeupdate', render);
  render();
})();

