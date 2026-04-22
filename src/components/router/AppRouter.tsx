import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { DcbGamePage } from "@/features/dcb/pages/DcbGamePage";
import { DrawingPage } from "@/features/dcb/pages/DrawingPage";
import { ThreeDGamePage } from "@/features/3d_game/pages/ThreeDGamePage";
import { ScratchGamePage } from "@/features/scratch/pages/ScratchGamePage";
import { WuMaGamePage } from "@/features/scratch/pages/WuMaGamePage";
import { HaoYun10GamePage } from "@/features/scratch/pages/HaoYun10GamePage";
import { MaDaoChengGongGamePage } from "@/features/scratch/pages/MaDaoChengGongGamePage";
import { HaoYunLaiGamePage } from "@/features/scratch/pages/HaoYunLaiGamePage";
import { ChaoJi9GamePage } from "@/features/scratch/pages/ChaoJi9GamePage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AchievementCenterPage } from "@/pages/AchievementCenterPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { useUserStore } from "@/store/useUserStore";

function Protected({ children }: { children: ReactElement }) {
  const username = useUserStore((s) => s.username);
  if (!username) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * 应用路由表：登录 / 主页 / 双色球主流程 / 全屏开奖页。
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <MainLayout>
              <HomePage />
            </MainLayout>
          </Protected>
        }
      />
      <Route
        path="/achievements"
        element={
          <Protected>
            <MainLayout>
              <ErrorBoundary title="成就中心加载失败">
                <AchievementCenterPage />
              </ErrorBoundary>
            </MainLayout>
          </Protected>
        }
      />
      <Route
        path="/dcb"
        element={
          <Protected>
            <MainLayout>
              <DcbGamePage />
            </MainLayout>
          </Protected>
        }
      />
      <Route
        path="/3d"
        element={
          <Protected>
            <MainLayout>
              <ThreeDGamePage />
            </MainLayout>
          </Protected>
        }
      />
      <Route
        path="/scratch"
        element={
          <Protected>
            <MainLayout>
              <ScratchGamePage />
            </MainLayout>
          </Protected>
        }
      />
      <Route
        path="/wuma"
        element={
          <Protected>
            <MainLayout>
              <WuMaGamePage />
            </MainLayout>
          </Protected>
        }
      />
      <Route
        path="/haoyun10"
        element={
          <Protected>
            <MainLayout>
              <HaoYun10GamePage />
            </MainLayout>
          </Protected>
        }
      />
      <Route
        path="/madaochenggong"
        element={
          <Protected>
            <MainLayout>
              <MaDaoChengGongGamePage />
            </MainLayout>
          </Protected>
        }
      />
      <Route
        path="/haoyunlai"
        element={
          <Protected>
            <MainLayout>
              <HaoYunLaiGamePage />
            </MainLayout>
          </Protected>
        }
      />
      <Route
        path="/chaoji9"
        element={
          <Protected>
            <MainLayout>
              <ChaoJi9GamePage />
            </MainLayout>
          </Protected>
        }
      />
      <Route
        path="/dcb/drawing"
        element={
          <Protected>
            <DrawingPage />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
