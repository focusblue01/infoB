"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

function WelcomeContent() {
  const params = useSearchParams();
  const already = params.get("already") === "1";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background to-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <CardTitle className="text-2xl">
            {already ? "이미 인증된 계정입니다" : "가입이 완료되었습니다"}
          </CardTitle>
          <CardDescription>InfoB 에 오신 것을 환영합니다 🎉</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground text-center space-y-2">
          {already ? (
            <>
              <p>이미 이메일 인증이 완료된 계정입니다.</p>
              <p>아래 버튼으로 로그인 페이지로 이동하세요.</p>
            </>
          ) : (
            <>
              <p>이메일 인증이 정상적으로 처리되었습니다.</p>
              <p>아래 버튼으로 로그인 페이지로 이동해 InfoB 를 시작하세요.</p>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Link href="/login" className="w-full">
            <Button className="w-full">InfoB 로그인 페이지로 이동</Button>
          </Link>
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            홈으로 돌아가기
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeContent />
    </Suspense>
  );
}
