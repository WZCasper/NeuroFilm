import { SiteHeader } from "@/components/layout/SiteHeader";
import { NotificationListener } from "@/components/notifications/NotificationListener";

/**
 * Сюда (и только сюда) подключаются <Toaster />, PWA install prompt и
 * всё, что связано с уведомлениями — /obs-room не использует этот
 * layout, поэтому ни один из этих элементов физически не может попасть
 * в кадр трансляции.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <NotificationListener />
    </>
  );
}
