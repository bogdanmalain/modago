// src/services/notificationService.js

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { createAudioPlayer } from "expo-audio";
import { supabase } from "../supabaseClient";

// ── Handler notificări (trebuie să fie primul) ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Sunet mesaj nou ──
let messagePlayer = null;

function getPlayer() {
  try {
    if (!messagePlayer) {
      messagePlayer = createAudioPlayer(
        require("../../assets/sounds/message.mp3"),
      );
    }
    return messagePlayer;
  } catch (e) {
    console.log("⚠️ getPlayer:", e);
    return null;
  }
}
export async function playMessageSound() {
  try {
    // console.log("🔊 playMessageSound apelată!"); // ← adaugă asta
    const player = getPlayer();
    if (!player) {
      console.log("❌ player null");
      return;
    }
    player.seekTo(0);
    player.play();
  } catch (e) {
    console.log("⚠️ playMessageSound:", e);
  }
}

export function unloadSound() {
  try {
    if (messagePlayer) {
      messagePlayer.remove();
      messagePlayer = null;
    }
  } catch (e) {
    console.log("⚠️ unloadSound:", e);
  }
}

// ── Push Token Registration ──
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log("⚠️ Push notifications necesită device fizic.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("⚠️ Push permissions denied. Status:", finalStatus);
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.error("❌ projectId lipsă din app.config.js!");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data;
    console.log("📱 Push token obținut:", token);
    return token ?? null;
  } catch (e) {
    console.error("❌ getExpoPushTokenAsync:", e.message);
    return null;
  }
}

// ── Salvează token în Supabase ──
export async function savePushToken(userId, token) {
  if (!userId || !token) return;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ push_token: token })
      .eq("id", userId);

    if (error) console.log("⚠️ savePushToken:", error.message);
    else console.log("✅ Push token salvat în Supabase");
  } catch (e) {
    console.log("❌ savePushToken:", e);
  }
}

// ── Șterge token la logout ──
export async function clearPushToken(userId) {
  if (!userId) return;
  try {
    await supabase
      .from("profiles")
      .update({ push_token: null })
      .eq("id", userId);
  } catch (e) {
    console.log("⚠️ clearPushToken:", e);
  }
}

// ── Setup complet (apelat la login) ──
export async function setupPushNotifications(userId) {
  if (Platform.OS === "web") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Mesaje",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00BFA5",
    });
  }

  const token = await registerForPushNotifications();
  if (token) {
    await savePushToken(userId, token);
  }
}

// ── Badge count ──
export async function fetchUnreadCount(userId) {
  if (!userId) return 0;
  try {
    const { data: convos } = await supabase
      .from("conversations")
      .select("id")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    if (!convos?.length) return 0;

    const convoIds = convos.map((c) => c.id);
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convoIds)
      .neq("sender_id", userId)
      .is("read_at", null);

    return count ?? 0;
  } catch (e) {
    console.log("⚠️ fetchUnreadCount:", e);
    return 0;
  }
}
