import Constants from 'expo-constants'

/**
 * Where the MGM exam website (the mgm-test Next.js app) runs. Every API call goes to this address.
 *
 *   'auto'                          Local development: the computer Expo is running on, port 3000.
 *                                   The phone can already reach it, and it follows Wi-Fi IP changes.
 *   'https://exam.your-college.in'  The deployed website. Use this for builds you give to students.
 */
export const SERVER: string = 'auto'

/** Port of the website when SERVER is 'auto' (`npm run dev` in mgm-test uses 3000). */
export const DEV_PORT = 3000

export const API_URL = "https://test.exponentor.com" // Constants.expoConfig?.extra?.apiUrl ?? 'auto'

/**
 * Where the JEMS stats server (the `trial` Express app: GitHub repos + LeetCode stats) runs.
 *
 *   'auto'                          Local development: the computer Expo is running on, port JEMS_DEV_PORT.
 *   'https://jems-api.your-host'    The deployed server. Use this for builds you give to students.
 */
export const JEMS_SERVER: string = 'auto'

/** Port of the stats server when JEMS_SERVER is 'auto' (`npm start` in trial uses 4000). */
export const JEMS_DEV_PORT = 4000

// Expo's dev server address is the computer's LAN IP, which the phone can already reach.
const devHost = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'
export const JEMS_API_URL = JEMS_SERVER === 'auto' ? `http://${devHost}:${JEMS_DEV_PORT}` : JEMS_SERVER.replace(/\/$/, '')
