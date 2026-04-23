"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CategorySelector } from "@/components/onboarding/CategorySelector";
import { KeywordInput } from "@/components/onboarding/KeywordInput";
import { RssSourceInput } from "@/components/onboarding/RssSourceInput";
import type { NewsCategory } from "@/types";
import { Save, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useUserRole } from "@/lib/user-context";
import { canUseEmailNotification, canUseKeywords, canUseRss, maxCategories, maxKeywords } from "@/lib/permissions";
import { useFontSize, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_STEP } from "@/lib/font-size-context";

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const role = useUserRole();
  const { percent: fontPercent, setPercent: setFontPercent } = useFontSize();
  const [pendingFontPercent, setPendingFontPercent] = useState(fontPercent);
  useEffect(() => { setPendingFontPercent(fontPercent); }, [fontPercent]);
  const emailNotifEnabled = canUseEmailNotification(role);
  const keywordsEnabled = canUseKeywords(role);
  const rssEnabled = canUseRss(role);
  const catLimit = maxCategories(role);
  const kwLimit = maxKeywords(role);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationTime, setNotificationTime] = useState("07:00");

  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);
  const [rssSources, setRssSources] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/interests").then((r) => r.json()),
      fetch("/api/sources").then((r) => r.json()),
    ]).then(([settings, interests, sources]) => {
      setDisplayName(settings.profile?.display_name ?? "");
      setEmail(settings.email ?? "");
      setNotificationEnabled(settings.profile?.notification_enabled ?? true);
      setNotificationTime(settings.profile?.notification_time?.slice(0, 5) ?? "07:00");
      setCategories((interests.categories ?? []).map((c: any) => c.category));
      setKeywords((interests.keywords ?? []).map((k: any) => k.keyword));
      setExcludeKeywords((interests.excludeKeywords ?? []).map((k: any) => k.keyword));
      setRssSources((sources.sources ?? []).map((s: any) => ({ name: s.name, url: s.url })));
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: displayName,
            notification_enabled: notificationEnabled,
            notification_time: notificationTime,
          }),
        }),
        fetch("/api/interests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categories, keywords, excludeKeywords, rssSources }),
        }),
      ]);
      setFontPercent(pendingFontPercent);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between max-md:px-3">
        <h1 className="text-2xl font-bold">{t.settings}</h1>
        <Button onClick={handleSave} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? t.saving : t.save}
        </Button>
      </div>

      {/* 계정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.account}</CardTitle>
          <CardDescription>{t.accountDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.name}</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t.email}</Label>
              <Input value={email} disabled />
            </div>
          </div>
          <Separator />
          <div className={`flex items-center justify-between ${!emailNotifEnabled ? "opacity-50" : ""}`}>
            <div>
              <Label>{t.emailNotification}</Label>
              <p className="text-sm text-muted-foreground">{t.emailNotificationDesc}</p>
              {!emailNotifEnabled && (
                <p className="text-xs text-muted-foreground mt-0.5">{t.upgradePlanRequired}</p>
              )}
            </div>
            <Switch checked={notificationEnabled && emailNotifEnabled} onCheckedChange={emailNotifEnabled ? setNotificationEnabled : undefined} disabled={!emailNotifEnabled} />
          </div>
          {notificationEnabled && emailNotifEnabled && (
            <div className="space-y-2">
              <Label>{t.notificationTime}</Label>
              <Input type="time" value={notificationTime} onChange={(e) => setNotificationTime(e.target.value)} className="w-32" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 화면 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.displaySettings}</CardTitle>
          <CardDescription>{t.displaySettingsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>{t.fontSize}</Label>
            <p className="text-sm text-muted-foreground">{t.fontSizeDesc}</p>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted/30 font-semibold leading-none"
              style={{ fontSize: `${Math.max(14, pendingFontPercent * 0.32)}px` }}
              aria-hidden
            >
              A
            </div>
            <div className="flex-1 space-y-1.5">
              <input
                type="range"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={FONT_SIZE_STEP}
                value={pendingFontPercent}
                onChange={(e) => setPendingFontPercent(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{FONT_SIZE_MIN}%</span>
                <span className="font-medium text-foreground">{pendingFontPercent}%</span>
                <span>{FONT_SIZE_MAX}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 관심사 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.interests}</CardTitle>
          <CardDescription>{t.interestsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>{t.categoriesLabel}</Label>
            <CategorySelector selected={categories} onChange={setCategories} maxSelect={catLimit} />
          </div>
          <Separator />
          {keywordsEnabled ? (
            <>
              <KeywordInput keywords={keywords} onChange={setKeywords} maxKeywords={kwLimit} />
              <KeywordInput
                keywords={excludeKeywords}
                onChange={setExcludeKeywords}
                variant="exclude"
                maxKeywords={kwLimit}
              />
            </>
          ) : (
            <div className="rounded-md bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              {t.upgradePlanRequired}
            </div>
          )}
          <Separator />
          <RssSourceInput sources={rssSources} onChange={setRssSources} disabled={!rssEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
