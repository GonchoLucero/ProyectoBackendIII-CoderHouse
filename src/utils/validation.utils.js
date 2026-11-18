export const validateEnum = (value, allowed, ErrorClass) => {
  if (value !== undefined && !Object.values(allowed).includes(value)) {
    throw new ErrorClass(value, allowed);
  }
};
