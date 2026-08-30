// Backs the "Remember me" login option. When remembered, the session survives
// browser restarts (localStorage); when not, it's cleared as soon as the tab
// closes (sessionStorage). The marker itself always lives in localStorage so
// it can be read before we know which store the token is actually in.
const REMEMBER_KEY = "cs360_remember";

export function setRemember(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
}

export function getAuthStorage(): Storage {
  return localStorage.getItem(REMEMBER_KEY) === "0" ? sessionStorage : localStorage;
}

export function clearAuthStorage(keys: string[]) {
  for (const key of keys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
  localStorage.removeItem(REMEMBER_KEY);
}
