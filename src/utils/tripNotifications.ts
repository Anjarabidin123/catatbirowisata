import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";

export interface TripData {
  id: string;
  nama_trip: string;
  tanggal: string;
  tujuan: string;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Web notifications
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return false;
  }

  // Native notifications
  const result = await LocalNotifications.requestPermissions();
  return result.display === "granted";
}

export async function scheduleTripNotifications(trip: TripData): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return; // Skip scheduling for web
  }

  try {
    const tripDate = new Date(trip.tanggal);
    const now = new Date();

    // Remove existing notifications for this trip
    await cancelTripNotifications(trip.id);

    const notifications: any[] = [];

    // H-2: 2 days before at 9 AM
    const twoDaysBefore = new Date(tripDate);
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
    twoDaysBefore.setHours(9, 0, 0, 0);
    
    if (twoDaysBefore > now) {
      notifications.push({
        id: parseInt(`${trip.id.substring(0, 8)}01`, 16) % 2147483647,
        title: "🗓️ Trip 2 Hari Lagi!",
        body: `${trip.nama_trip} ke ${trip.tujuan} akan dimulai dalam 2 hari. Sudah siap?`,
        schedule: { at: twoDaysBefore },
        sound: "default",
        extra: { tripId: trip.id, type: "h-2" },
      });
    }

    // H-1: 1 day before at 9 AM
    const oneDayBefore = new Date(tripDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(9, 0, 0, 0);
    
    if (oneDayBefore > now) {
      notifications.push({
        id: parseInt(`${trip.id.substring(0, 8)}02`, 16) % 2147483647,
        title: "⏰ Trip Besok!",
        body: `${trip.nama_trip} ke ${trip.tujuan} besok! Cek persiapan terakhir ya.`,
        schedule: { at: oneDayBefore },
        sound: "default",
        extra: { tripId: trip.id, type: "h-1" },
      });
    }

    // H-5 jam: 5 hours before
    const fiveHoursBefore = new Date(tripDate);
    fiveHoursBefore.setHours(fiveHoursBefore.getHours() - 5);
    
    if (fiveHoursBefore > now) {
      notifications.push({
        id: parseInt(`${trip.id.substring(0, 8)}03`, 16) % 2147483647,
        title: "🚌 Trip Dalam 5 Jam!",
        body: `${trip.nama_trip} akan dimulai dalam 5 jam. Jangan lupa bawa semua barang!`,
        schedule: { at: fiveHoursBefore },
        sound: "default",
        extra: { tripId: trip.id, type: "h-5" },
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log(`Scheduled ${notifications.length} notifications for trip ${trip.nama_trip}`);
    }
  } catch (error) {
    console.error("Error scheduling trip notifications:", error);
  }
}

export async function cancelTripNotifications(tripId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Cancel all notifications with this trip ID
    const notificationIds = [
      parseInt(`${tripId.substring(0, 8)}01`, 16) % 2147483647,
      parseInt(`${tripId.substring(0, 8)}02`, 16) % 2147483647,
      parseInt(`${tripId.substring(0, 8)}03`, 16) % 2147483647,
    ];

    await LocalNotifications.cancel({ notifications: notificationIds.map(id => ({ id })) });
    console.log(`Cancelled notifications for trip ${tripId}`);
  } catch (error) {
    console.error("Error cancelling trip notifications:", error);
  }
}

export async function setupNotificationListeners(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Handle notification tap
  await LocalNotifications.addListener("localNotificationActionPerformed", (notification) => {
    console.log("Notification tapped:", notification);
    const tripId = notification.notification.extra?.tripId;
    if (tripId) {
      // Navigate to dashboard or trip detail
      window.location.href = "/";
    }
  });
}
