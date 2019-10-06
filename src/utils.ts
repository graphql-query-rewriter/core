/** @hidden */
export const identifyFunc = <T>(val: T) => val;

/** @hidden */
export const pushToArrayAtKey = <T>(mapping: { [key: string]: T[] }, key: string, val: T): void => {
  if (!mapping[key]) mapping[key] = [];
  mapping[key].push(val);
};
