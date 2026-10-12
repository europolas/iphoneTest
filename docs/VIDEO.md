# MP4 preview demo

The original iphoneTest demo now includes a native inline video player and a text
status showing its last meaningful event, current state, position/duration, speed,
volume and playback errors. Native event names (play, pause, seeking, seeked, etc.)
remain visible for debugging. timeupdate changes the position without hiding the
last meaningful event. A bounded eight-event list also shows readiness/loading
changes without hiding a pause or completed seek. No playback history or video data is persisted.

English is default. Set data-video-language="lt" on the video card for Lithuanian
labels and errors. Both use the canonical library src/translations dictionaries;
prepare-pages.py publishes them in video-locales/ and includes them in the build
hash. They must not be independently edited in generated output.

Source: MDN's CC0 video sample at
https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4
The bundled assets/demo.mp4 is a small test clip; replace it with your own MP4
when needed. The tag declares video/mp4; controls and playsinline preserve native
controls and inline iPhone playback. Playback starts only after user interaction.

The app worker caches the observer and dictionaries, but skips video and Range
requests so the browser can stream and seek using server byte ranges. The video
requires network access after an offline reload. Its metadata and errors remain
visible without changing the full-height iPhone scroller or blur overlays.

Browser regression checks use the actual bundled MP4: metadata, play, pause, seek,
end, English/Lithuanian rendering and timeupdate behavior. Installed iPhone testing
is still needed for native fullscreen, hardware decoder and OS interruption behavior.
