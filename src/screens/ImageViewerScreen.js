// src/screens/ImageViewerScreen.js
// ImageViewer (iOS/Android) – animated open from thumbnail + 20/60/20 container
// - Close: swipe up/down OR X
// - No counter
// - Slower, iOS-Photos-like transition (smooth easing)
// NOTE: fly animation uses JS driver (useNativeDriver:false) because we animate left/top/width/height.

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
  Image,
  Animated,
  Easing,
  Platform,
  StatusBar,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// iOS Photos-like feel
const EASE_SOFT = Easing.bezier(0.22, 1, 0.36, 1);

function getExt(uri = "") {
  try {
    const clean = String(uri).split("?")[0].toLowerCase();
    const dot = clean.lastIndexOf(".");
    if (dot === -1) return "";
    return clean.slice(dot + 1);
  } catch {
    return "";
  }
}

export default function ImageViewerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const imagesParam = route?.params?.images ?? [];
  const startIndexParam = route?.params?.startIndex ?? 0;

  // origin = { x, y, width, height } from measureInWindow
  const origin = route?.params?.origin ?? null;
  const originUri = route?.params?.originUri ?? null;

  const images = useMemo(
    () => (Array.isArray(imagesParam) ? imagesParam.filter(Boolean) : []),
    [imagesParam],
  );

  const startIndex = clamp(
    Number(startIndexParam) || 0,
    0,
    Math.max(images.length - 1, 0),
  );

  const [activeIndex, setActiveIndex] = useState(startIndex);
  const listRef = useRef(null);

  // ----- Layout: 20 / 60 / 20 -----
  const topGap = Math.round(SCREEN_H * 0.2);
  const containerH = Math.round(SCREEN_H * 0.6);
  const containerTop = topGap; // leaves bottom ~20%

  // ----- Anim values -----
  const bgOpacity = useRef(new Animated.Value(0)).current;

  // animated “flying” image (from thumb to container)
  const flyX = useRef(new Animated.Value(origin?.x ?? 0)).current;
  const flyY = useRef(new Animated.Value(origin?.y ?? 0)).current;
  const flyW = useRef(new Animated.Value(origin?.width ?? SCREEN_W)).current;
  const flyH = useRef(new Animated.Value(origin?.height ?? containerH)).current;

  // visibility for flying layer (0/1) using JS driver to avoid driver-mixing issues
  const flyVisible = useRef(new Animated.Value(origin ? 1 : 0)).current;

  // container opacity (viewer content)
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // vertical swipe to close
  const dragY = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  const canAnimateFromThumb = !!(origin && originUri);

  const activeUri = images[activeIndex] || null;

  // the image to show in “flying” overlay
  // Prefer the tapped thumb URI; fallback to active
  const flyUri = canAnimateFromThumb
    ? originUri
    : activeUri || originUri || null;

  const close = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // iOS-like close
    const duration = 420;

    const anims = [
      Animated.timing(bgOpacity, {
        toValue: 0,
        duration,
        easing: EASE_SOFT,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 220,
        easing: EASE_SOFT,
        useNativeDriver: true,
      }),
      Animated.timing(dragY, {
        toValue: 0,
        duration: 220,
        easing: EASE_SOFT,
        useNativeDriver: true,
      }),
    ];

    if (canAnimateFromThumb) {
      // show fly layer back
      anims.push(
        Animated.timing(flyVisible, {
          toValue: 1,
          duration: 60,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      );

      anims.push(
        Animated.parallel([
          Animated.timing(flyX, {
            toValue: origin.x,
            duration,
            easing: EASE_SOFT,
            useNativeDriver: false,
          }),
          Animated.timing(flyY, {
            toValue: origin.y,
            duration,
            easing: EASE_SOFT,
            useNativeDriver: false,
          }),
          Animated.timing(flyW, {
            toValue: origin.width,
            duration,
            easing: EASE_SOFT,
            useNativeDriver: false,
          }),
          Animated.timing(flyH, {
            toValue: origin.height,
            duration,
            easing: EASE_SOFT,
            useNativeDriver: false,
          }),
        ]),
      );
    }

    Animated.parallel(anims).start(() => {
      navigation.goBack();
    });
  }, [
    bgOpacity,
    contentOpacity,
    dragY,
    navigation,
    canAnimateFromThumb,
    origin,
    flyX,
    flyY,
    flyW,
    flyH,
    flyVisible,
  ]);

  // pan responder: only vertical intent
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) => {
        const dx = Math.abs(g.dx);
        const dy = Math.abs(g.dy);
        if (dy < 10) return false;
        return dy > dx; // vertical intent
      },
      onPanResponderMove: (_evt, g) => {
        dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_evt, g) => {
        const dy = g.dy;
        const vy = g.vy;

        const shouldClose = Math.abs(dy) > 120 || Math.abs(vy) > 1.2;
        if (shouldClose) {
          close();
          return;
        }

        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 0,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 18,
          bounciness: 0,
        }).start();
      },
    });
  }, [close, dragY]);

  // update active index
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      const idx = viewableItems[0]?.index ?? 0;
      setActiveIndex(idx);
    }
  }).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });

  useEffect(() => {
    try {
      StatusBar.setBarStyle("light-content");
      if (Platform.OS === "android") {
        StatusBar.setBackgroundColor("rgba(0,0,0,0.35)");
        StatusBar.setTranslucent(true);
      }
    } catch {}

    // jump to start
    requestAnimationFrame(() => {
      try {
        listRef.current?.scrollToIndex?.({
          index: startIndex,
          animated: false,
        });
      } catch {}
    });

    // iOS Photos-like open (slower + smooth)
    const flyDuration = 650;
    const bgDuration = 520;

    // background fade
    Animated.timing(bgOpacity, {
      toValue: 1,
      duration: bgDuration,
      easing: EASE_SOFT,
      useNativeDriver: true,
    }).start();

    // content fades in after bg begins
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 380,
      delay: 180,
      easing: EASE_SOFT,
      useNativeDriver: true,
    }).start();

    // fly from thumbnail to container if we have origin
    if (canAnimateFromThumb) {
      // reset to origin in case of re-open
      flyX.setValue(origin.x);
      flyY.setValue(origin.y);
      flyW.setValue(origin.width);
      flyH.setValue(origin.height);
      flyVisible.setValue(1);

      Animated.parallel([
        Animated.timing(flyX, {
          toValue: 0,
          duration: flyDuration,
          easing: EASE_SOFT,
          useNativeDriver: false,
        }),
        Animated.timing(flyY, {
          toValue: containerTop,
          duration: flyDuration,
          easing: EASE_SOFT,
          useNativeDriver: false,
        }),
        Animated.timing(flyW, {
          toValue: SCREEN_W,
          duration: flyDuration,
          easing: EASE_SOFT,
          useNativeDriver: false,
        }),
        Animated.timing(flyH, {
          toValue: containerH,
          duration: flyDuration,
          easing: EASE_SOFT,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // after landing, hide flying image (slightly delayed so it feels continuous)
        Animated.timing(flyVisible, {
          toValue: 0,
          duration: 140,
          delay: 90,
          easing: EASE_SOFT,
          useNativeDriver: false,
        }).start();
      });
    } else {
      // no origin -> ensure fly hidden
      flyVisible.setValue(0);
    }

    return () => {
      try {
        StatusBar.setBarStyle("dark-content");
      } catch {}
    };
  }, [
    bgOpacity,
    contentOpacity,
    startIndex,
    canAnimateFromThumb,
    origin,
    flyX,
    flyY,
    flyW,
    flyH,
    flyVisible,
    containerTop,
    containerH,
  ]);

  return (
    <Animated.View style={[styles.root, { opacity: 1 }]}>
      {/* background */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: "#000", opacity: bgOpacity },
        ]}
      />

      {/* X button (higher) */}
      <View
        style={[styles.topBar, { paddingTop: Math.max(insets.top, 10) }]}
        pointerEvents="box-none"
      >
        <View style={{ flex: 1 }} />
        <Pressable onPress={close} hitSlop={12} style={styles.closeBtn}>
          <Text style={styles.closeX}>×</Text>
        </Pressable>
      </View>

      {/* Main container 20/60/20 + swipe close */}
      <Animated.View
        style={[
          styles.container,
          {
            top: containerTop,
            height: containerH,
            opacity: contentOpacity,
            transform: [{ translateY: dragY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewConfigRef.current}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          renderItem={({ item: uri }) => (
            <View style={styles.page}>
              {/* cover inside fixed container (Vinted/Photos-like stage) */}
              <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            </View>
          )}
        />
      </Animated.View>

      {/* Flying overlay image */}
      {flyUri ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flyWrap,
            {
              opacity: flyVisible,
              left: flyX,
              top: flyY,
              width: flyW,
              height: flyH,
            },
          ]}
        >
          <Image
            source={{ uri: flyUri }}
            style={styles.flyImg}
            resizeMode="cover"
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 14,
    alignItems: "flex-end",
  },

  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeX: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 26,
    marginTop: -2,
  },

  // 20/60/20 container
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    overflow: "hidden",
  },

  page: {
    width: SCREEN_W,
    height: "100%",
    backgroundColor: "#000",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  // flying image overlay
  flyWrap: {
    position: "absolute",
    zIndex: 25,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  flyImg: {
    width: "100%",
    height: "100%",
  },
});
