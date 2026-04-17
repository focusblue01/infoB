// KST(Asia/Seoul) 기준 오늘 날짜 YYYY-MM-DD 반환
export function getKSTDateString(date?: Date): string {
  const d = date ?? new Date();
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split("T")[0];
}

export function getKSTYesterday(): string {
  return getKSTDateString(new Date(Date.now() - 86400000));
}
