export const EPSILON_0_REAL = 8.8541878128e-12; // Vacuum permittivity (F/m)

export const FIELD_MULTIPLIER = 1 / (20 * Math.PI * EPSILON_0_REAL);
export const EPSILON_0 = FIELD_MULTIPLIER * EPSILON_0_REAL;
export const K_E = 1 / (4 * Math.PI * EPSILON_0);