export const CANONICAL_AUDIO_TRACK_ID = 'track-van-vat';

/** Fields refreshed on an existing canonical audio track (force mode only). */
export const CANONICAL_AUDIO_TRACK_UPDATE = {
  volume: 0.8,
  loop: true,
  startAt: 0.0,
  fadeIn: 2.0,
  fadeOut: 2.0,
};

export const CANONICAL_AUDIO_TRACK_CREATE = {
  id: CANONICAL_AUDIO_TRACK_ID,
  title: 'Vạn vật như muốn ta bên nhau',
  artist: 'Hoàng Dũng',
  src: '/music/van-vat-nhu-muon-ta-ben-nhau.mp3',
  autoPlay: true,
  loop: true,
  volume: 0.8,
  startAt: 0.0,
  fadeIn: 2.0,
  fadeOut: 2.0,
};
