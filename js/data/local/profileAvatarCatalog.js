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
  localAvatar("monster-sun", "Monstro sol", "monstros", "#dd8b0d"),
  localAvatar("monster-pink", "Monstro rosa", "monstros", "#d63a89"),
  localAvatar("monster-lime", "Monstro limão", "monstros", "#48a23d"),
  localAvatar("monster-lilac", "Monstro lilás", "monstros", "#7044cb"),
  localAvatar("monster-ember", "Monstro brasa", "monstros", "#d74f12"),
  localAvatar("monster-jelly", "Monstro gelatina", "monstros", "#2ba9b2"),
  localAvatar("monster-snow", "Monstro neve", "monstros", "#538bc9"),
  localAvatar("monster-garden", "Monstro jardim", "monstros", "#68a530"),
  localAvatar("princess-coral", "Princesa coral", "princesas", "#99466f"),
  localAvatar("princess-floral", "Princesa floral", "princesas", "#8a3f65"),
  localAvatar("princess-starlight", "Princesa estrela", "princesas", "#6753af"),
  localAvatar("princess-royal", "Princesa real", "princesas", "#4d2f96"),
  localAvatar("prince-forest", "Príncipe da floresta", "príncipes", "#345b43"),
  localAvatar("prince-royal", "Príncipe real", "príncipes", "#34508d"),
  localAvatar("hero-scarlet", "Herói escarlate", "heróis", "#923446"),
  localAvatar("hero-navy", "Herói azul", "heróis", "#244b8e"),
  localAvatar("prince-ebony", "Príncipe real", "príncipes", "#a26b19"),
  localAvatar("hero-ebony", "Herói urbano", "heróis", "#28509e"),
  localAvatar("astronaut", "Astronauta", "profissões", "#2f65a8"),
  localAvatar("doctor", "Médico", "profissões", "#4760a6"),
  localAvatar("firefighter", "Bombeira", "profissões", "#a33e38"),
  localAvatar("scientist", "Cientista", "profissões", "#5a3a9b"),
  localAvatar("doctor-ebony", "Médico", "profissões", "#28909c"),
  localAvatar("firefighter-ebony", "Bombeiro", "profissões", "#bf523f"),
  localAvatar("scientist-latino", "Cientista", "profissões", "#7052a9"),
  localAvatar("teacher-fair", "Professor", "profissões", "#c08436"),
  localAvatar("doctor-east-asian", "Médica", "profissões", "#459a9c"),
  localAvatar("engineer-brown", "Engenheira", "profissões", "#8b63b9"),
  localAvatar("scientist-south-asian", "Cientista", "profissões", "#3e7fc4"),
  localAvatar("ranger-indigenous", "Guarda-parque", "profissões", "#56834e"),
  localAvatar("casual-east-asian", "Estilo casual", "cotidiano", "#3d80cb"),
  localAvatar("casual-south-asian", "Estilo casual", "cotidiano", "#9b4450"),
  localAvatar("casual-ebony", "Estilo casual", "cotidiano", "#c65758"),
  localAvatar("casual-fair", "Estilo casual", "cotidiano", "#7358aa"),
  localAvatar("casual-ebony-teen", "Estilo casual", "cotidiano", "#b07b29"),
  localAvatar("casual-mixed-teen", "Estilo casual", "cotidiano", "#3d9e9b")
];
