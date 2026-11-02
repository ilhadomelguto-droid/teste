// Built-in profile artwork keeps the profile editor useful even when the
// optional remote avatar catalogue is unavailable.  These ids are stable and
// are therefore safe to sync with the same StreamTV account on another
// NuvioWeb installation.
const AVATAR_BASE_PATH = "assets/avatars";

function localAvatar(id, displayName, category, bgColor) {
  return {
    id: `streamtv-${id}`,
    displayName,
    category,
    bgColor,
    imageUrl: `${AVATAR_BASE_PATH}/${id}.jpg`,
    sortOrder: 10
  };
}

export const BUILT_IN_PROFILE_AVATARS = [
  localAvatar("monster-aqua", "Monstro aqua", "monstros", "#0c5d83"),
  localAvatar("monster-coral", "Monstro coral", "monstros", "#9b3157"),
  localAvatar("monster-violet", "Monstro violeta", "monstros", "#6631a6"),
  localAvatar("monster-sky", "Monstro céu", "monstros", "#1166a1"),
  localAvatar("princess-coral", "Princesa coral", "princesas", "#99466f"),
  localAvatar("princess-floral", "Princesa floral", "princesas", "#8a3f65"),
  localAvatar("princess-starlight", "Princesa estrela", "princesas", "#6753af"),
  localAvatar("princess-royal", "Princesa real", "princesas", "#4d2f96"),
  localAvatar("prince-forest", "Príncipe da floresta", "príncipes", "#345b43"),
  localAvatar("prince-royal", "Príncipe real", "príncipes", "#34508d"),
  localAvatar("hero-scarlet", "Herói escarlate", "heróis", "#923446"),
  localAvatar("hero-navy", "Herói azul", "heróis", "#244b8e"),
  localAvatar("astronaut", "Astronauta", "profissões", "#2f65a8"),
  localAvatar("doctor", "Médico", "profissões", "#4760a6"),
  localAvatar("firefighter", "Bombeira", "profissões", "#a33e38"),
  localAvatar("scientist", "Cientista", "profissões", "#5a3a9b")
];
