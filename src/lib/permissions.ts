import type { UserRole } from "@/types";

// A/T: 모든 기능 사용 가능 (관리자/테스터) — 바로생성 무제한
// S : 바로생성 1회/일, 모든 기능 (북마크/이메일/날짜네비/RSS/키워드5)
// R : 바로생성 1회/일, 카테고리 5개·키워드 3개, 날짜네비/북마크/이메일 가능
// N : 바로생성 불가, 카테고리 3개, 키워드/날짜/북마크/이메일 불가

const FREE_ROLES: UserRole[] = ["N", "R"];
const BASIC_PAID_ROLES: UserRole[] = ["R"];
const FULL_ROLES: UserRole[] = ["S", "A", "T"];
// 무제한 바로생성 — 운영/내부 테스트 한정
const UNLIMITED_GENERATE_ROLES: UserRole[] = ["A", "T"];
// 일 1회 바로생성 한도가 적용되는 롤 (R, S 공통)
const DAILY_GENERATE_LIMITED_ROLES: UserRole[] = ["R", "S"];

export function canGenerate(role: UserRole) {
  return role !== "N";
}

export function canGenerateUnlimited(role: UserRole) {
  return UNLIMITED_GENERATE_ROLES.includes(role);
}

/**
 * 바로생성에 일 1회 제한이 적용되는 롤. R 외에 S 도 포함.
 * (서버측 last_generated_date 체크와 같이 사용)
 */
export function isDailyGenerateLimited(role: UserRole) {
  return DAILY_GENERATE_LIMITED_ROLES.includes(role);
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
