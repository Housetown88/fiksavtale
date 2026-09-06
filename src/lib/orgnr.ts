const WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2];

export function normalizeOrgNumber(value: string): string {
  return value.replace(/\s+/g, "");
}

export function isValidOrgNumber(value: string): boolean {
  const digits = normalizeOrgNumber(value);
  if (!/^\d{9}$/.test(digits)) return false;
  const check = Number(digits[8]);
  const sum = digits
    .slice(0, 8)
    .split("")
    .reduce((acc, digit, index) => acc + Number(digit) * WEIGHTS[index], 0);
  const remainder = sum % 11;
  const expected = remainder === 0 ? 0 : 11 - remainder;
  if (expected === 10) return false;
  return expected === check;
}

export function orgNumberWithChecksum(firstEight: string): string {
  const digits = firstEight.replace(/\D/g, "");
  if (digits.length !== 8) {
    throw new Error("Trenger åtte siffer");
  }
  const sum = digits
    .split("")
    .reduce((acc, digit, index) => acc + Number(digit) * WEIGHTS[index], 0);
  const remainder = sum % 11;
  const check = remainder === 0 ? 0 : 11 - remainder;
  if (check === 10) {
    throw new Error("Ugyldig stamnummer for organisasjonsnummer");
  }
  return `${digits}${check}`;
}
