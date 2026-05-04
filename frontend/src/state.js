const KEY = 'aiWorkoutMvp.user'

export function loadUser() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveUser(user) {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function clearUser() {
  localStorage.removeItem(KEY)
}

