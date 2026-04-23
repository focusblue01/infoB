import type { UserRole } from "@/types";

// A/T: 모든 기능 사용 가능 (관리자/테스터)
// S: 바로생성 무제한, 모든 기능
// R: 바로생성 1회/일, 카테고리 2개, 날짜/북마크/이메일 불가
// N: 바로생성 불가, 카테고리 2개, 키워드/날짜/북마크/이메일 불가

const FREE_ROLES: UserRole[] = ["N", "R"];
const BASIC_PAID_ROLES: UserRole[] = ["R"];
const FULL_ROLES: UserRole[] = ["S", "A", "T"];

export function canGenerate(role: UserRole) {
  return role !== "N";
}

export function canGenerateUnlimited(role: UserRole) {
  return FULL_ROLES.includes(role);
}

export function canUseKeywords(role: UserRole) {
  return role !== "N";
}

export function canUseRss(role: UserRole) {
  return FULL_ROLES.includes(role);
}

export function maxKeywords(role: UserRole): number {
  if (role === "N") return 0;
  if (role === "R") return 3;
  return 5; // S, A, T
}

export function canUseEmailNotification(role: UserRole) {
  return FULL_ROLES.includes(role);
}

export function canNavigateDates(role: UserRole) {
  return FULL_ROLES.includes(role);
}

export function canBookmark(role: UserRole) {
  return FULL_ROLES.includes(role);
}

export function maxCategories(role: UserRole): number {
  return FREE_ROLES.includes(role) || BASIC_PAID_ROLES.includes(role) ? 2 : 99;
}
