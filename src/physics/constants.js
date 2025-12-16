const epsilon_0_real = 8.8541878128e-12; // Vacuum permittivity (F/m)

export const FIELD_MULTIPLIER = 1 / (20 * Math.PI * epsilon_0_real);
export const MAG_FIELD_MULTIPLIER = 1e7;

export const EPSILON_0 = FIELD_MULTIPLIER * epsilon_0_real;
export const K_E = 1 / (4 * Math.PI * EPSILON_0);
export const MU_0_REAL = 4 * Math.PI * 1e-7;
export const MU_0 = 4 * Math.PI * 1e-7 * MAG_FIELD_MULTIPLIER;