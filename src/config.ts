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
