import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Providers } from '@/components/providers/Providers';
import { ToastContainer } from '@/components/ui/Toast';
import { ViewerOverlayWrapper } from '@/components/viewer/ViewerOverlayWrapper';
import { PWARegistration } from '@/components/PWARegistration';
import MainPage from '@/pages/MainPage';
import ReviewPage from '@/pages/ReviewPage';
import InvitePage from '@/pages/InvitePage';
import TemplateBrowserPage from '@/pages/TemplateBrowserPage';
import SpikeStreamingPage from '@/pages/SpikeStreamingPage';
import SpikeHaqRagPage from '@/pages/SpikeHaqRagPage';

// Mirrors the old Next.js app/review/layout.tsx: minimal chrome for external reviewers
function ReviewLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-surface">{children}</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <PWARegistration />
      <Providers>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route
            path="/review"
            element={
              <ReviewLayout>
                <ReviewPage />
              </ReviewLayout>
            }
          />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/demo/template-browser" element={<TemplateBrowserPage />} />
          <Route path="/spike/streaming" element={<SpikeStreamingPage />} />
          <Route path="/spike/haq-rag" element={<SpikeHaqRagPage />} />
        </Routes>
      </Providers>
      <ToastContainer />
      <ViewerOverlayWrapper />
    </BrowserRouter>
  );
}
