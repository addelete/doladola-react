export const getItem = <T>(key: string, defaultValue?:T): T | undefined => {
  try {
    const valueWithExpire = localStorage.getItem(`${APP_SIGN}:${key}`);
    if(valueWithExpire === null) {
      return undefined;
    }
    const { value, endTime } = JSON.parse(valueWithExpire);
    if(endTime && endTime <= new Date().getTime()) {
      removeItem(key);
      return defaultValue;
    }
    return value;
  } catch (e) {
    removeItem(key);
    return defaultValue;
  }
}

export const setItem = (key: string, value: any, endTime?: number) => {
  return localStorage.setItem(`${APP_SIGN}:${key}`, JSON.stringify({ value, endTime }));
}

export const removeItem = (key: string) => {
  return localStorage.removeItem(`${APP_SIGN}:${key}`);
}

const cache = {
  getItem,
  setItem,
  removeItem,
};

export default cache;
