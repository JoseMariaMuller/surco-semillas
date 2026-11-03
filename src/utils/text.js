// Pasa a minúscula solo la primera letra: "Grupo de madurez IV" → "grupo de madurez IV".
export const minusculaInicial = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s)
