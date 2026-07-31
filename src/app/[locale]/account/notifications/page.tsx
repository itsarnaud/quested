import { NotificationPreferences } from "@/app/[locale]/account/notification-preferences";
import { PushNotificationsSection } from "@/app/[locale]/account/push-notifications-section";

export default function AccountNotificationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <NotificationPreferences />
      <PushNotificationsSection />
    </div>
  );
}
