export const waitForSeconds = (seconds: number) => new Promise((res) => setTimeout(() => res(null), seconds * 1000))