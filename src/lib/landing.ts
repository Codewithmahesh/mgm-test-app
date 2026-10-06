// Where to go right after sign-in. The root layout sends students to /student by default;
// a sign-in screen can ask for a deeper landing page (e.g. JEMS) just before signing in.

let landing: string | null = null

export function setLanding(href: string | null) {
  landing = href
}

/** Returns the requested landing page once, then forgets it. */
export function takeLanding() {
  const href = landing
  landing = null
  return href
}
