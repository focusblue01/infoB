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

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationTime, setNotificationTime] = useState("07:00");

  // Interests
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
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">설정</h1>
        <Button onClick={handleSave} disabled={saving} className="gap-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          저장
        </Button>
      </div>

      {/* 계정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">계정</CardTitle>
          <CardDescription>프로필 및 알림 설정</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>이름</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>이메일</Label>
              <Input value={email} disabled />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>이메일 브리핑 알림</Label>
              <p className="text-sm text-muted-foreground">매일 아침 이메일로 브리핑을 받습니다</p>
            </div>
            <Switch checked={notificationEnabled} onCheckedChange={setNotificationEnabled} />
          </div>
          {notificationEnabled && (
            <div className="space-y-2">
              <Label>알림 시간</Label>
              <Input type="time" value={notificationTime} onChange={(e) => setNotificationTime(e.target.value)} className="w-32" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 관심사 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">관심사</CardTitle>
          <CardDescription>뉴스 수집 및 요약에 사용되는 관심사 설정</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>카테고리</Label>
            <CategorySelector selected={categories} onChange={setCategories} />
          </div>
          <Separator />
          <KeywordInput keywords={keywords} onChange={setKeywords} />
          <KeywordInput
            keywords={excludeKeywords}
            onChange={setExcludeKeywords}
            label="제외 키워드"
            placeholder="보고 싶지 않은 키워드"
            variant="exclude"
          />
          <Separator />
          <RssSourceInput sources={rssSources} onChange={setRssSources} />
        </CardContent>
      </Card>
    </div>
  );
}
