import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Сюда (и только сюда) в дальнейшем подключаются:
 *  - <Toaster /> / всплывающие уведомления интерфейса,
 *  - логика PWA install prompt (beforeinstallprompt),
 *  - Notification.requestPermission() для push-уведомлений.
 * /obs-room не использует этот layout, поэтому ни один из этих
 * элементов физически не может попасть в кадр трансляции.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
    </>
  );
}
